import type { DifficultyProfile } from "./models.ts";
import { isMatchingValue } from "./seeded.ts";
import type { BoardEngine } from "./boardEngine.ts";

const profiles: Record<string, Omit<DifficultyProfile, "level">> = {
  easy: {
    name: "Easy",
    matchDensity: 0.93,
    decoyDensity: 0.0,
    pairDistance: "low",
    chainDepth: 1,
    targetAddRows: [1, 1],
    helperRatio: 0.85,
    setupRatio: 0.15,
    decoyRatio: 0.0,
    scoreRange: [0, 25],
    reachableMatchTarget: 15,
    diversityTarget: 0.65,
    validation: {
      targetAddRows: 1,
      minReachablePairs: 15,
      minDigitDiversity: 0.60,
      minSolutionBranches: 5,
      maxDeadlocks: 0,
      targetWinRate: 0.90,
      maxAddRowDependencyScore: 0.15
    }
  },
  easyPlus: { 
    name: "Easy+", matchDensity: 0.55, decoyDensity: 0.18, pairDistance: "low", chainDepth: 2, targetAddRows: [1, 2], helperRatio: 0.65, setupRatio: 0.22, decoyRatio: 0.13, scoreRange: [15, 40], reachableMatchTarget: 10, diversityTarget: 0.70,
    validation: { targetAddRows: 2, minReachablePairs: 6, minDigitDiversity: 0.65, minSolutionBranches: 4, maxDeadlocks: 1, targetWinRate: 0.90, maxAddRowDependencyScore: 0.50 }
  },
  normal: { 
    name: "Normal", matchDensity: 0.45, decoyDensity: 0.24, pairDistance: "medium", chainDepth: 2, targetAddRows: [2, 3], helperRatio: 0.6, setupRatio: 0.25, decoyRatio: 0.15, scoreRange: [30, 55], reachableMatchTarget: 8, diversityTarget: 0.75,
    validation: { targetAddRows: 3, minReachablePairs: 5, minDigitDiversity: 0.70, minSolutionBranches: 3, maxDeadlocks: 2, targetWinRate: 0.85, maxAddRowDependencyScore: 0.60 }
  },
  hard: { 
    name: "Hard", matchDensity: 0.38, decoyDensity: 0.3, pairDistance: "medium", chainDepth: 3, targetAddRows: [2, 3], helperRatio: 0.55, setupRatio: 0.28, decoyRatio: 0.17, scoreRange: [45, 70], reachableMatchTarget: 6, diversityTarget: 0.80,
    validation: { targetAddRows: 3, minReachablePairs: 4, minDigitDiversity: 0.75, minSolutionBranches: 2, maxDeadlocks: 3, targetWinRate: 0.75, maxAddRowDependencyScore: 0.70 }
  },
  hardPlus: { 
    name: "Hard+", matchDensity: 0.35, decoyDensity: 0.32, pairDistance: "medium", chainDepth: 3, targetAddRows: [2, 4], helperRatio: 0.5, setupRatio: 0.3, decoyRatio: 0.2, scoreRange: [55, 78], reachableMatchTarget: 5, diversityTarget: 0.85,
    validation: { targetAddRows: 4, minReachablePairs: 3, minDigitDiversity: 0.80, minSolutionBranches: 2, maxDeadlocks: 4, targetWinRate: 0.60, maxAddRowDependencyScore: 0.75 }
  },
  veryHard: { 
    name: "Very Hard", matchDensity: 0.22, decoyDensity: 0.38, pairDistance: "high", chainDepth: 4, targetAddRows: [3, 5], helperRatio: 0.34, setupRatio: 0.3, decoyRatio: 0.36, scoreRange: [68, 90], reachableMatchTarget: 3, diversityTarget: 0.90,
    validation: { targetAddRows: 5, minReachablePairs: 2, minDigitDiversity: 0.85, minSolutionBranches: 1, maxDeadlocks: 5, targetWinRate: 0.40, maxAddRowDependencyScore: 0.85 }
  },
  peak: { 
    name: "Peak", matchDensity: 0.15, decoyDensity: 0.4, pairDistance: "high", chainDepth: 5, targetAddRows: [4, 6], helperRatio: 0.3, setupRatio: 0.3, decoyRatio: 0.4, scoreRange: [78, 100], reachableMatchTarget: 2, diversityTarget: 0.95,
    validation: { targetAddRows: 6, minReachablePairs: 1, minDigitDiversity: 0.90, minSolutionBranches: 1, maxDeadlocks: 6, targetWinRate: 0.25, maxAddRowDependencyScore: 0.95 }
  }
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
