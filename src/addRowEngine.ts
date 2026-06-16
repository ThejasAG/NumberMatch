import type { AddRowInput, BoardAnalysis } from "./models.ts";
import { BoardEngine } from "./boardEngine.ts";
import { CleanupEngine } from "./cleanupEngine.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";
import { complementOf, deterministicSeed, SeededSequence } from "./seeded.ts";

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

  findMissingComplements(board: BoardEngine): Map<number, number> {
    const map = new Map<number, number>();
    for (const value of board.getRemainingNumbers()) map.set(value, complementOf(value));
    return map;
  }

  generateAddRow(board: BoardEngine, input: AddRowInput): number[] {
    const profile = this.difficulty.getDifficultyProfile(input.level);
    const rng = new SeededSequence(deterministicSeed(input.level, input.attempt + input.remainingAddRows));
    const analysis = this.analyzeBoard(board, input.level);
    const row: number[] = [];
    const helperCount = Math.max(1, Math.round(BoardEngine.width * profile.helperRatio));
    const setupCount = Math.round(BoardEngine.width * profile.setupRatio);
    const pool = analysis.remainingNumbers.length ? analysis.remainingNumbers : [rng.int(1, 9)];

    for (let i = 0; i < helperCount; i++) row.push(complementOf(rng.pick(pool)));
    for (let i = 0; i < setupCount && row.length < BoardEngine.width; i++) row.push(rng.pick(pool));
    while (row.length < BoardEngine.width) row.push(this.decoyAgainst(pool, rng));

    const biased = this.cleanup.applyCleanupBias(row, board);
    this.ensureFutureMatch(biased, board, rng);
    return biased;
  }

  calculateHelpfulness(row: number[], board: BoardEngine): number {
    const values = board.getRemainingNumbers();
    if (values.length === 0) return 1;
    const helpers = row.filter((v) => values.includes(complementOf(v)) || values.includes(v)).length;
    return helpers / row.length;
  }

  private ensureFutureMatch(row: number[], board: BoardEngine, rng: SeededSequence): void {
    const values = board.getRemainingNumbers();
    if (values.length > 0) row[0] = complementOf(values[values.length - 1]);
    if (row.length >= 3) {
      const a = rng.int(1, 9);
      row[1] = a;
      row[2] = complementOf(a);
    }
    for (let i = 3; i + 1 < row.length; i += 2) {
      const a = rng.int(1, 9);
      row[i] = a;
      row[i + 1] = complementOf(a);
    }
  }

  private decoyAgainst(pool: number[], rng: SeededSequence): number {
    for (let i = 0; i < 9; i++) {
      const candidate = rng.int(1, 9);
      if (!pool.includes(candidate) && !pool.includes(complementOf(candidate))) return candidate;
    }
    return rng.int(1, 9);
  }
}
