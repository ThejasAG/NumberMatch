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

  private addMockRow(board: BoardEngine, row: number[]): void {
    for (let i = 0; i < row.length; i += BoardEngine.width) {
      board.addRow(row.slice(i, i + BoardEngine.width));
    }
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
    
    this.addMockRow(mockBoard, row);
    
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
    if (remainingNumbers.length === 0) {
      return [1, 9, 2, 8, 3, 7, 4, 6, 5]; // Default fallback if board is empty
    }

    // Generate complements alternating between same-number and sum-to-10
    const generated = remainingNumbers.map((val, index) => {
      const isEven = index % 2 === 0;
      return isEven ? val : complementOf(val);
    });

    // Reverse for sequential clearing order (zipper/seesaw effect)
    return generated.reverse();
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
    this.addMockRow(mockBoard, row);
    
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
    this.addMockRow(mockBoard, row);
    return mockBoard.findAllValidPairs().length;
  }

  calculateBoardAwareHelpfulness(row: number[], originalBoard: BoardEngine): number {
    const initialPairs = originalBoard.findAllValidPairs().length;
    
    const state = originalBoard.getBoardState();
    const clonedState = state.map(r => r.slice());
    const mockBoard = new BoardEngine(clonedState);
    this.addMockRow(mockBoard, row);
    
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
