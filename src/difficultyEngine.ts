import type { DifficultyProfile } from "./models.ts";
import { isMatchingValue } from "./seeded.ts";
import type { BoardEngine } from "./boardEngine.ts";

const profiles: Record<string, Omit<DifficultyProfile, "level">> = {
  easy: { name: "Easy", matchDensity: 0.7, decoyDensity: 0.1, pairDistance: "low", chainDepth: 1, targetAddRows: [1, 1], helperRatio: 0.6, setupRatio: 0.3, decoyRatio: 0.1, scoreRange: [0, 25] },
  easyPlus: { name: "Easy+", matchDensity: 0.55, decoyDensity: 0.18, pairDistance: "low", chainDepth: 2, targetAddRows: [1, 2], helperRatio: 0.5, setupRatio: 0.32, decoyRatio: 0.18, scoreRange: [15, 40] },
  normal: { name: "Normal", matchDensity: 0.45, decoyDensity: 0.24, pairDistance: "medium", chainDepth: 2, targetAddRows: [2, 2], helperRatio: 0.4, setupRatio: 0.36, decoyRatio: 0.24, scoreRange: [30, 55] },
  hard: { name: "Hard", matchDensity: 0.38, decoyDensity: 0.3, pairDistance: "medium", chainDepth: 3, targetAddRows: [2, 3], helperRatio: 0.3, setupRatio: 0.4, decoyRatio: 0.3, scoreRange: [45, 70] },
  hardPlus: { name: "Hard+", matchDensity: 0.35, decoyDensity: 0.32, pairDistance: "medium", chainDepth: 3, targetAddRows: [2, 3], helperRatio: 0.3, setupRatio: 0.38, decoyRatio: 0.32, scoreRange: [55, 78] },
  veryHard: { name: "Very Hard", matchDensity: 0.22, decoyDensity: 0.38, pairDistance: "high", chainDepth: 4, targetAddRows: [3, 5], helperRatio: 0.2, setupRatio: 0.42, decoyRatio: 0.38, scoreRange: [68, 90] },
  peak: { name: "Peak", matchDensity: 0.15, decoyDensity: 0.4, pairDistance: "high", chainDepth: 5, targetAddRows: [4, 6], helperRatio: 0.15, setupRatio: 0.45, decoyRatio: 0.4, scoreRange: [78, 100] }
};

export class DifficultyEngine {
  getDifficultyProfile(level: number): DifficultyProfile {
    const cycle = ((level - 1) % 10) + 1;
    const key = cycle === 1 ? "easy" : cycle === 2 ? "easyPlus" : cycle === 3 || cycle === 6 ? "normal" : cycle === 4 || cycle === 7 ? "hard" : cycle === 5 || cycle === 8 ? "hardPlus" : cycle === 9 ? "veryHard" : "peak";
    return { level, ...profiles[key] };
  }

  calculateDifficulty(board: BoardEngine): number {
    const values = board.getRemainingNumbers();
    if (values.length === 0) return 0;
    const pairs = board.findAllValidPairs();
    const density = pairs.length / Math.max(1, values.length);
    const decoys = values.filter((v, i) => !values.some((x, j) => i !== j && isMatchingValue(v, x))).length / values.length;
    const heightPressure = Math.min(1, board.getBoardHeight() / 20);
    return Math.round(Math.max(0, Math.min(100, 100 - density * 80 + decoys * 35 + heightPressure * 25)));
  }

  validateDifficultyRange(board: BoardEngine, level: number): boolean {
    const [min, max] = this.getDifficultyProfile(level).scoreRange;
    const score = this.calculateDifficulty(board);
    return score >= min && score <= max;
  }

  getTargetAddRows(level: number): [number, number] {
    return this.getDifficultyProfile(level).targetAddRows;
  }
}
