import type { AddRowInput, BoardAnalysis } from "./models.ts";
import { BoardEngine } from "./boardEngine.ts";
import { CleanupEngine } from "./cleanupEngine.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";
import { complementOf, deterministicSeed, SeededSequence, isMatchingValue } from "./seeded.ts";

export class SmartAddRowEngine {
  private difficulty: DifficultyEngine;
  private cleanup: CleanupEngine;

  constructor(
    difficulty = new DifficultyEngine(),
    cleanup = new CleanupEngine()
  ) {
    this.difficulty = difficulty;
    this.cleanup = cleanup;
  }

  analyzeBoard(board: BoardEngine, level = 1): BoardAnalysis {
    return {
      remainingNumbers: board.getRemainingNumbers(),
      existingMatches: board.findAllValidPairs(),
      missingComplements: this.findMissingComplements(board),
      sparseRows: this.cleanup.findSparseRows(board),
      difficultyScore: this.difficulty.calculateDifficulty(board)
    };
  }

  analyzeBoardFrequency(board: BoardEngine): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 1; i <= 9; i++) map.set(i, 0);
    
    const state = board.getBoardState();
    
    // First, count global frequency
    for (const val of board.getRemainingNumbers()) {
      map.set(val, map.get(val)! + 1);
    }
    
    // Straggler Multiplier: Scan rows for isolated numbers
    for (const row of state) {
      const activeCells = row.filter(cell => cell !== null);
      if (activeCells.length === 1) {
        const straggler = activeCells[0]!;
        // +10 weight guarantees this straggler gets highest priority in Add Row generation
        map.set(straggler, map.get(straggler)! + 10);
      }
    }
    
    return map;
  }

  findMissingComplements(board: BoardEngine): Map<number, number> {
    const map = new Map<number, number>();
    for (const value of board.getRemainingNumbers()) map.set(value, complementOf(value));
    return map;
  }

  generateMinimalRescueRow(board: BoardEngine, remainingNumbers: number[]): number[] {
    const exactComplements = remainingNumbers.map(n => complementOf(n));
    // Reverse the complements so they clear perfectly like a zipper in reading order!
    // Example: stranded [1, 2, 3] -> adds [7, 8, 9]. 3 matches 7, then 2 matches 8, then 1 matches 9.
    return exactComplements.reverse();
  }

  private validateRescueRow(board: BoardEngine, row: number[]): boolean {
    const state = board.getBoardState();
    const clonedState = state.map(r => r.slice());
    const mockBoard = new BoardEngine(clonedState);
    
    // Initial pairs before adding
    const pairsBefore = mockBoard.findAllValidPairs().length;
    
    mockBoard.addRow(row.slice());
    
    // Validate immediate legal move exists
    const pairsAfter = mockBoard.findAllValidPairs();
    if (pairsAfter.length === 0 || pairsAfter.length <= pairsBefore) {
        return false;
    }
    
    let moves = 0;
    // We must ensure the board CLEARS completely
    while (moves < 40) {
      const pairs = mockBoard.findAllValidPairs();
      if (pairs.length === 0) break;
      
      pairs.sort((p1, p2) => {
        const dist1 = Math.abs(p1.a.row - p1.b.row) + Math.abs(p1.a.col - p1.b.col);
        const dist2 = Math.abs(p2.a.row - p2.b.row) + Math.abs(p2.a.col - p2.b.col);
        return dist1 - dist2;
      });
      
      mockBoard.removePair(pairs[0].a, pairs[0].b);
      moves++;
    }
    
    const remainingAfterRescue = mockBoard.getRemainingNumbers().length;
    return remainingAfterRescue === 0 && remainingAfterRescue <= pairsBefore * 2;
  }

  generateAddRow(board: BoardEngine, input: AddRowInput): number[] {
    const remainingNumbers = board.getRemainingNumbers();
    if (input.level === 1 && remainingNumbers.length <= 8) {
      return this.generateMinimalRescueRow(board, remainingNumbers);
    }

    const attemptOffsetMax = 50;
    const candidates: { row: number[], reachableMatches: number, helpfulness: number }[] = [];
    
    const freqMap = this.analyzeBoardFrequency(board);
    const sortedDigits = Array.from(freqMap.entries())
      .filter(([val, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Parity safe length calculation
    let targetLength = BoardEngine.width;
    if (input.level === 1) {
      targetLength = remainingNumbers.length % 2 === 0 ? 2 : 3;
    } else {
      if ((remainingNumbers.length + targetLength) % 2 !== 0) {
         targetLength = BoardEngine.width - 1; // E.g., 8 digits to keep total even
      }
    }
    
    const isInstantMatchForced = input.forceInstantMatch === true;

    for (let attemptOffset = 0; attemptOffset < attemptOffsetMax; attemptOffset++) {
      const rng = new SeededSequence(deterministicSeed(input.level, input.attempt + input.remainingAddRows + attemptOffset));
      const row: number[] = [];
      
      let boardAwareCount = input.level === 1 ? targetLength : Math.floor(targetLength * 0.6); // 100% board aware for Level 1
      
      if (isInstantMatchForced) {
         // Force an instant, guaranteed match at the start of the row
         const a = rng.pick([1, 2, 3, 4, 5, 8]);
         const b = a === 8 || a === 5 ? a : complementOf(a);
         row.push(a, b);
         boardAwareCount = Math.max(0, boardAwareCount - 2);
      }

      // Add required board-aware numbers
      let added = 0;
      for (const val of sortedDigits) {
        if (added >= boardAwareCount) break;
        const count = freqMap.get(val)!;
        const comp = complementOf(val);
        // Cap at 2 copies to prevent "walls" of identical numbers and force diversity
        const copies = Math.min(count, 2, boardAwareCount - added);
        for (let i = 0; i < copies; i++) {
            row.push(comp);
            added++;
        }
      }

      // Pad the rest of the row with safe, perfectly-clearing decoy pairs
      // This hides the required numbers and provides "Stealth" randomness
      while (row.length + 1 < targetLength) {
         const decoy = rng.int(1, 9);
         const comp = rng.next() > 0.5 ? decoy : complementOf(decoy);
         row.push(decoy, comp);
      }
      
      // If there's an odd gap left (which shouldn't happen mathematically due to parity safety), fill it safely
      if (row.length < targetLength) {
         row.push(rng.pick(sortedDigits)); // At least make it board-aware
      }

      // Strict Stealth Shuffle: Prevent identical numbers from clumping
      this.stealthShuffle(row, rng, isInstantMatchForced ? 2 : 0);
      
      const helpfulness = this.calculateBoardAwareHelpfulness(row, board);
      const reachableMatches = this.calculateReachableMatches(row, board);
      
      // Validate that every Add Row creates at least one immediate legal move
      if (input.level === 1 && reachableMatches <= board.findAllValidPairs().length) {
         continue; // skip rows that don't increase reachable matches
      }
      
      candidates.push({ row, reachableMatches, helpfulness });
    }

    if (candidates.length === 0) {
      // Emergency safe row
      if (input.level === 1) {
         return remainingNumbers.length % 2 === 0 ? [1, 9] : [1, 9, 1];
      }
      return [1, 9, 2, 8, 3, 7, 4, 4];
    }

    // Sort heavily by Helpfulness Score first, then ReachableMatch Score
    candidates.sort((a, b) => {
        if (b.helpfulness !== a.helpfulness) {
            return b.helpfulness - a.helpfulness;
        }
        return b.reachableMatches - a.reachableMatches;
    });

    return candidates[0].row;
  }

  private stealthShuffle(array: number[], rng: SeededSequence, preserveFirst: number = 0) {
    // Fisher-Yates with a constraint to prevent identical adjacent numbers
    for (let i = array.length - 1; i > preserveFirst; i--) {
      let j = preserveFirst + Math.floor(rng.next() * (i + 1 - preserveFirst));
      
      // Swap
      let temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    
    // Post-shuffle pass to break clumps (identical AND sum-to-10 pairs)
    for (let i = preserveFirst; i < array.length - 1; i++) {
        if (array[i] === array[i+1] || array[i] + array[i+1] === 10) {
            // Find a different number further down to swap with
            for (let k = i + 2; k < array.length; k++) {
                if (
                  array[k] !== array[i] && 
                  array[k] + array[i] !== 10 && 
                  (k === array.length - 1 || (array[k+1] !== array[k] && array[k+1] + array[k] !== 10))
                ) {
                    let temp = array[i+1];
                    array[i+1] = array[k];
                    array[k] = temp;
                    break;
                }
            }
        }
    }
  }

  calculateProjectedWinScore(row: number[], originalBoard: BoardEngine): number {
    const state = originalBoard.getBoardState();
    const clonedState = state.map(r => r.slice());
    const mockBoard = new BoardEngine(clonedState);
    mockBoard.addRow(row.slice());
    
    const initialNumbers = mockBoard.getRemainingNumbers().length;
    let moves = 0;
    const maxMoves = 15;
    
    while (moves < maxMoves) {
      const pairs = mockBoard.findAllValidPairs();
      if (pairs.length === 0) break;
      // Simple greedy pick: just pick the first valid pair
      const pair = pairs[0];
      mockBoard.removePair(pair.a, pair.b);
      moves++;
    }
    
    const finalNumbers = mockBoard.getRemainingNumbers().length;
    if (finalNumbers === 0) return 100;
    
    return Math.min(100, Math.round(((initialNumbers - finalNumbers) / Math.max(1, initialNumbers)) * 100));
  }

  calculateReachableMatches(row: number[], originalBoard: BoardEngine): number {
    const state = originalBoard.getBoardState();
    const clonedState = state.map(r => r.slice());
    const mockBoard = new BoardEngine(clonedState);
    mockBoard.addRow(row.slice());
    return mockBoard.findAllValidPairs().length;
  }

  calculateBoardAwareHelpfulness(row: number[], originalBoard: BoardEngine): number {
    const initialPairs = originalBoard.findAllValidPairs().length;
    
    const state = originalBoard.getBoardState();
    const clonedState = state.map(r => r.slice());
    const mockBoard = new BoardEngine(clonedState);
    mockBoard.addRow(row.slice());
    
    let newPairs = mockBoard.findAllValidPairs().length;
    
    // Simulate one step to see if it unlocks even more (chain reaction)
    if (newPairs > initialPairs) {
        const pairs = mockBoard.findAllValidPairs();
        if (pairs.length > 0) {
            mockBoard.removePair(pairs[0].a, pairs[0].b);
            const secondaryPairs = mockBoard.findAllValidPairs().length;
            newPairs += secondaryPairs * 0.5; // add bonus for chain potential
        }
    }
    
    return newPairs - initialPairs;
  }

  calculateHelpfulness(row: number[], board: BoardEngine): number {
    return this.calculateBoardAwareHelpfulness(row, board);
  }

  calculateFutureSolvability(row: number[], board: BoardEngine): number {
    const boardValues = board.getRemainingNumbers();
    let numbersWithComplements = 0;

    for (let i = 0; i < row.length; i++) {
      const val = row[i];
      const comp = complementOf(val);
      let hasComplement = boardValues.includes(comp) || boardValues.includes(val);
      if (!hasComplement) {
        for (let j = 0; j < row.length; j++) {
          if (i !== j && (row[j] === comp || row[j] === val)) {
            hasComplement = true;
            break;
          }
        }
      }
      if (hasComplement) numbersWithComplements++;
    }
    return (numbersWithComplements / row.length) * 100;
  }

  calculateDiversity(row: number[]): number {
    const unique = new Set(row);
    return (unique.size / row.length) * 100;
  }

  calculatePairDiversity(row: number[]): number {
    const pairTypes = new Set<string>();
    for (let i = 0; i < row.length; i++) {
       for (let j = i + 1; j < row.length; j++) {
           if (row[i] === row[j] || row[i] + row[j] === 10) {
               const min = Math.min(row[i], row[j]);
               const max = Math.max(row[i], row[j]);
               pairTypes.add(`${min}+${max}`);
           }
       }
    }
    return pairTypes.size;
  }

  private decoyAgainst(pool: number[], rng: SeededSequence): number {
    for (let i = 0; i < 9; i++) {
      const candidate = rng.int(1, 9);
      if (!pool.includes(candidate) && !pool.includes(complementOf(candidate))) return candidate;
    }
    return rng.int(1, 9);
  }

  private shuffle(array: number[], rng: SeededSequence) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private boardSeed(board: BoardEngine, remainingNumbers: number[]): number {
    let hash = board.getBoardHeight() * 97 + remainingNumbers.length * 131;
    for (const value of remainingNumbers) hash = (hash * 31 + value) >>> 0;
    return Math.max(1, hash);
  }
}
