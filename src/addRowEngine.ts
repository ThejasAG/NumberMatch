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

  private padRescueRow(baseRow: number[], remainingCount: number, rng: SeededSequence): number[] {
    let targetLength = BoardEngine.width;
    if ((remainingCount + targetLength) % 2 !== 0) {
      targetLength = BoardEngine.width - 1;
    }
    const padded = [...baseRow];
    while (padded.length + 1 < targetLength) {
      const val = rng.int(1, 9);
      const comp = rng.next() > 0.5 ? val : complementOf(val);
      padded.push(val, comp);
    }
    // If there's exactly 1 slot left due to some math oddity, just fill it with a valid number 
    // (though mathematically it shouldn't happen if baseRow matches the parity required).
    if (padded.length < targetLength) {
      padded.push(rng.int(1, 9)); 
    }
    return padded;
  }

  generateMinimalRescueRow(board: BoardEngine, remainingNumbers: number[]): number[] {
    const tryRow = (row: number[]) => this.validateRescueRow(board, row);
    // Use a fixed seed for deterministic behavior within a given level/attempt context if needed,
    // but here we just use Math.random since rescue is an emergency
    const rng = new SeededSequence(Math.floor(Math.random() * 100000));

    if (remainingNumbers.length === 1) {
      const n = remainingNumbers[0];
      const comp = complementOf(n);
      
      for (let i = 0; i < 100; i++) {
        const row = this.padRescueRow([comp], 1, rng);
        this.shuffle(row, rng);
        if (tryRow(row)) return row;
      }
      return this.padRescueRow([comp], 1, rng);
    }

    if (remainingNumbers.length === 2) {
      const n1 = remainingNumbers[0];
      const n2 = remainingNumbers[1];
      const c1 = complementOf(n1);
      const c2 = complementOf(n2);

      for (let i = 0; i < 100; i++) {
        const row = this.padRescueRow([c1, c2], 2, rng);
        this.shuffle(row, rng);
        if (tryRow(row)) return row;
      }
      
      // Fallback bridge
      for (let i = 0; i < 50; i++) {
        const row = this.padRescueRow([c1, c1, c2, c2], 2, rng);
        this.shuffle(row, rng);
        if (tryRow(row)) return row;
      }

      return this.padRescueRow([c1, c2], 2, rng);
    }

    if (remainingNumbers.length === 3) {
      const required = remainingNumbers.map(n => complementOf(n));
      for (let i = 0; i < 100; i++) {
         const row = this.padRescueRow(required, 3, rng);
         this.shuffle(row, rng);
         if (tryRow(row)) return row;
      }
      
      const fallback: number[] = [];
      for (let i = 0; i < 3; i++) {
         const n = remainingNumbers[i];
         const c = complementOf(n);
         fallback.push(c, n, c);
      }
      return fallback;
    }

    return remainingNumbers.map(n => complementOf(n));
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
    if (input.level === 1 && remainingNumbers.length <= 3) {
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
    if ((remainingNumbers.length + targetLength) % 2 !== 0) {
       targetLength = BoardEngine.width - 1; // E.g., 8 digits to keep total even
    }
    
    const isInstantMatchForced = input.forceInstantMatch === true;

    for (let attemptOffset = 0; attemptOffset < attemptOffsetMax; attemptOffset++) {
      const rng = new SeededSequence(deterministicSeed(input.level, input.attempt + input.remainingAddRows + attemptOffset));
      const row: number[] = [];
      
      let boardAwareCount = Math.floor(targetLength * 0.6); // ~60% board aware
      
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
      
      candidates.push({ row, reachableMatches, helpfulness });
    }

    if (candidates.length === 0) {
      // Emergency safe row
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
    
    // Post-shuffle pass to break clumps
    for (let i = preserveFirst; i < array.length - 1; i++) {
        if (array[i] === array[i+1]) {
            // Find a different number further down to swap with
            for (let k = i + 2; k < array.length; k++) {
                if (array[k] !== array[i] && (k === array.length - 1 || array[k+1] !== array[k])) {
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
    
    const newPairs = mockBoard.findAllValidPairs().length;
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
