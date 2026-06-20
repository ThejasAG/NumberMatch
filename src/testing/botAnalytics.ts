import type { GameBotResult } from "./gameBot.ts";
import type { SimulationHistoryDatabase } from "./botMetrics.ts";

export interface LevelAnalytics {
  level: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  completionRate: number;
  averageCompletionTime: number;
  fastestTime: number;
  slowestTime: number;
  averageMoves: number;
  averageAddRows: number;
  averageFutureSolvability: number;
  averageAddRowSuccessRate: number;
  averageReachableMatchScore: number;
  averageProjectedWinScore: number;
  averageBoardAwareHelpfulnessScore: number;
  criticalStuckRate: number;
  averageDiversityScore: number;
  averagePairDiversityScore: number;
  averageInitialReachablePairs: number;
  averageSolutionGraphBranchingFactor: number;
  averageDeadlockFrequency: number;
  averageAddRowDependencyScore: number;
  averageBoardDiversityScore: number;
  digitFrequencyDistribution: Record<number, number>;
  mostCommonGeneratedNumbers: number[];
  averageRescues: number;
  averageScore: number;
  rescueModeTriggerCount: number;
  winsWithRescue: number;
  winsWithoutRescue: number;
  oneNumberFailureRate: number;
  twoNumberFailureRate: number;
  threeNumberFailureRate: number;
  rescueSuccessRate: number;
  averageRemainingNumbersAtFailure: number;
  targetTime?: number;
}

export interface GlobalAnalytics {
  totalSimulations: number;
  totalWins: number;
  totalLosses: number;
  overallCompletionRate: number;
  overallAverageCompletionTime: number;
  overallAverageMoves: number;
  overallAverageAddRows: number;
  overallAverageFutureSolvability: number;
  overallAverageAddRowSuccessRate: number;
  overallAverageReachableMatchScore: number;
  overallAverageProjectedWinScore: number;
  overallAverageBoardAwareHelpfulnessScore: number;
  overallCriticalStuckRate: number;
  overallAverageDiversityScore: number;
  overallAveragePairDiversityScore: number;
  overallAverageInitialReachablePairs: number;
  overallAverageSolutionGraphBranchingFactor: number;
  overallAverageDeadlockFrequency: number;
  overallAverageAddRowDependencyScore: number;
  overallOrphanDigitCount: number;
  overallRescueTriggerRate: number;
  overallAverageDeadlockFrequency: number;
  overallAverageAddRowDependencyScore: number;
  overallAverageBoardDiversityScore: number;
  overallDigitFrequencyDistribution: Record<number, number>;
  overallMostCommonGeneratedNumbers: number[];
  overallAverageScore: number;
  mostDifficultLevel: number;
  easiestLevel: number;
  highestRescueRateLevel: number;
  highestAddRowUsageLevel: number;
  overallRescueModeTriggerCount: number;
  overallWinsWithRescue: number;
  overallWinsWithoutRescue: number;
  overallOneNumberFailureRate: number;
  overallTwoNumberFailureRate: number;
  overallThreeNumberFailureRate: number;
  overallRescueSuccessRate: number;
  overallAverageRemainingNumbersAtFailure: number;
}

export interface SawtoothValidationResult {
  passed: boolean;
  message: string;
}

export class BotAnalytics {
  private db: SimulationHistoryDatabase;

  constructor(db: SimulationHistoryDatabase) {
    this.db = db;
  }

  public getTop10FastestCompletions(): GameBotResult[] {
    return this.db.getAllResults()
      .filter(r => r.completed)
      .sort((a, b) => a.completionTimeSeconds - b.completionTimeSeconds)
      .slice(0, 10);
  }

  public getWorst10Runs(): GameBotResult[] {
    return this.db.getAllResults()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.completionTimeSeconds - a.completionTimeSeconds;
      })
      .slice(0, 10);
  }

  public getHighestScoringRun(): GameBotResult | null {
    const sorted = this.db.getAllResults().sort((a, b) => b.score - a.score);
    return sorted.length > 0 ? sorted[0] : null;
  }

  public getMostAddRowsUsed(): GameBotResult | null {
    const sorted = this.db.getAllResults().sort((a, b) => b.addRowsUsed - a.addRowsUsed);
    return sorted.length > 0 ? sorted[0] : null;
  }

  public getLevelAnalytics(level: number): LevelAnalytics {
    const results = this.db.getResultsByLevel(level);
    const wins = results.filter(r => r.completed);
    
    const digitDist: Record<number, number> = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
    for (const r of results) {
        if (r.digitDistribution) {
            for (let i = 1; i <= 9; i++) {
                digitDist[i] += (r.digitDistribution[i] || 0);
            }
        }
    }
    
    const mostCommonGeneratedNumbers = Object.entries(digitDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => parseInt(e[0], 10));

    let targetTime = 60;
    if (level === 1) targetTime = 45;
    else if (level === 3) targetTime = 90;
    else if (level === 5) targetTime = 150;

    if (results.length === 0) {
      return {
        level, gamesPlayed: 0, wins: 0, losses: 0, completionRate: 0,
        averageCompletionTime: 0, fastestTime: 0, slowestTime: 0,
        averageMoves: 0, averageAddRows: 0,
        averageFutureSolvability: 0, averageAddRowSuccessRate: 0,
        averageReachableMatchScore: 0, averageProjectedWinScore: 0, averageBoardAwareHelpfulnessScore: 0,
        criticalStuckRate: 0, averageDiversityScore: 0, averagePairDiversityScore: 0,
        averageInitialReachablePairs: 0, averageSolutionGraphBranchingFactor: 0, averageDeadlockFrequency: 0,
        averageAddRowDependencyScore: 0, averageBoardDiversityScore: 0,
        digitFrequencyDistribution: digitDist, mostCommonGeneratedNumbers,
        averageRescues: 0, averageScore: 0,
        rescueModeTriggerCount: 0, winsWithRescue: 0, winsWithoutRescue: 0,
        oneNumberFailureRate: 0, twoNumberFailureRate: 0,
        threeNumberFailureRate: 0, rescueSuccessRate: 0, averageRemainingNumbersAtFailure: 0,
        targetTime
      };
    }

    const completedTimes = wins.map(w => w.completionTimeSeconds);
    const lossesList = results.filter(r => !r.completed);
    
    let oneNumFails = 0, twoNumFails = 0, threeNumFails = 0, totalRem = 0;
    for (const l of lossesList) {
       totalRem += l.remainingNumbersAtFailure;
       if (l.remainingNumbersAtFailure === 1) oneNumFails++;
       else if (l.remainingNumbersAtFailure === 2) twoNumFails++;
       else if (l.remainingNumbersAtFailure === 3) threeNumFails++;
    }
    
    let rescuesTriggered = 0;
    let winsWithRescue = 0;
    let winsWithoutRescue = 0;
    
    for (const r of results) {
       if (r.rescueModeTriggered) rescuesTriggered++;
       if (r.wonWithRescue) winsWithRescue++;
       if (r.wonWithoutRescue) winsWithoutRescue++;
    }

    return {
      level,
      gamesPlayed: results.length,
      wins: wins.length,
      losses: results.length - wins.length,
      completionRate: wins.length / results.length,
      averageCompletionTime: completedTimes.length ? completedTimes.reduce((a,b) => a + b, 0) / completedTimes.length : 0,
      fastestTime: completedTimes.length ? Math.min(...completedTimes) : 0,
      slowestTime: completedTimes.length ? Math.max(...completedTimes) : 0,
      averageMoves: results.reduce((sum, r) => sum + r.moves, 0) / results.length,
      averageAddRows: results.reduce((sum, r) => sum + r.addRowsUsed, 0) / results.length,
      averageFutureSolvability: results.reduce((sum, r) => sum + (r.averageFutureSolvability || 0), 0) / results.length,
      averageAddRowSuccessRate: results.reduce((sum, r) => sum + (r.addRowSuccessRate || 0), 0) / results.length,
      averageReachableMatchScore: results.reduce((sum, r) => sum + (r.averageReachableMatchScore || 0), 0) / results.length,
      averageProjectedWinScore: results.reduce((sum, r) => sum + (r.averageProjectedWinScore || 0), 0) / results.length,
      averageBoardAwareHelpfulnessScore: results.reduce((sum, r) => sum + (r.averageBoardAwareHelpfulnessScore || 0), 0) / results.length,
      criticalStuckRate: results.reduce((sum, r) => sum + (r.criticalStuckRate || 0), 0) / results.length,
      averageDiversityScore: results.reduce((sum, r) => sum + (r.averageDiversityScore || 0), 0) / results.length,
      averagePairDiversityScore: results.reduce((sum, r) => sum + (r.averagePairDiversityScore || 0), 0) / results.length,
      averageInitialReachablePairs: results.reduce((sum, r) => sum + (r.initialReachablePairs || 0), 0) / results.length,
      averageSolutionGraphBranchingFactor: results.reduce((sum, r) => sum + (r.solutionGraphBranchingFactor || 0), 0) / results.length,
      averageDeadlockFrequency: results.reduce((sum, r) => sum + (r.deadlockFrequency || 0), 0) / results.length,
      averageAddRowDependencyScore: results.reduce((sum, r) => sum + (r.addRowDependencyScore || 0), 0) / results.length,
      averageBoardDiversityScore: results.reduce((sum, r) => sum + (r.boardDiversityScore || 0), 0) / results.length,
      digitFrequencyDistribution: digitDist,
      mostCommonGeneratedNumbers,
      averageRescues: results.reduce((sum, r) => sum + r.rescuesTriggered, 0) / results.length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      rescueModeTriggerCount: rescuesTriggered,
      winsWithRescue,
      winsWithoutRescue,
      oneNumberFailureRate: lossesList.length ? oneNumFails / lossesList.length : 0,
      twoNumberFailureRate: lossesList.length ? twoNumFails / lossesList.length : 0,
      threeNumberFailureRate: lossesList.length ? threeNumFails / lossesList.length : 0,
      rescueSuccessRate: rescuesTriggered ? winsWithRescue / rescuesTriggered : 0,
      averageRemainingNumbersAtFailure: lossesList.length ? totalRem / lossesList.length : 0,
      targetTime
    };
  }

  public getGlobalAnalytics(): GlobalAnalytics {
    const all = this.db.getAllResults();
    const wins = all.filter(r => r.completed);
    const totalSimulations = all.length;
    const totalWins = wins.length;
    
    // Aggregate by level
    const levelMap = new Map<number, GameBotResult[]>();
    const digitDist: Record<number, number> = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
    for (const r of all) {
      if (!levelMap.has(r.level)) levelMap.set(r.level, []);
      levelMap.get(r.level)!.push(r);
      
      if (r.digitDistribution) {
          for (let i = 1; i <= 9; i++) {
              digitDist[i] += (r.digitDistribution[i] || 0);
          }
      }
    }
    
    const overallMostCommonGeneratedNumbers = Object.entries(digitDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => parseInt(e[0], 10));

    let easiestLevel = 1;
    let mostDifficultLevel = 1;
    let maxRescueRate = -1;
    let highestRescueRateLevel = 1;
    let maxAddRow = -1;
    let highestAddRowUsageLevel = 1;

    let minWinRate = 2;
    let maxWinRate = -1;

    for (const [level, res] of levelMap.entries()) {
      const winRate = res.filter(r => r.completed).length / res.length;
      if (winRate < minWinRate) { minWinRate = winRate; mostDifficultLevel = level; }
      if (winRate > maxWinRate) { maxWinRate = winRate; easiestLevel = level; }

      const rescueRate = res.reduce((sum, r) => sum + r.rescuesTriggered, 0) / res.length;
      if (rescueRate > maxRescueRate) { maxRescueRate = rescueRate; highestRescueRateLevel = level; }

      const addRowUsage = res.reduce((sum, r) => sum + r.addRowsUsed, 0) / res.length;
      if (addRowUsage > maxAddRow) { maxAddRow = addRowUsage; highestAddRowUsageLevel = level; }
    }

    return {
      totalSimulations,
      totalWins,
      totalLosses: totalSimulations - totalWins,
      overallCompletionRate: totalSimulations ? totalWins / totalSimulations : 0,
      overallAverageCompletionTime: totalWins ? wins.reduce((sum, w) => sum + w.completionTimeSeconds, 0) / totalWins : 0,
      overallAverageMoves: totalSimulations ? all.reduce((sum, r) => sum + r.moves, 0) / totalSimulations : 0,
      overallAverageAddRows: totalSimulations ? all.reduce((sum, r) => sum + r.addRowsUsed, 0) / totalSimulations : 0,
      overallAverageFutureSolvability: totalSimulations ? all.reduce((sum, r) => sum + (r.averageFutureSolvability || 0), 0) / totalSimulations : 0,
      overallAverageAddRowSuccessRate: totalSimulations ? all.reduce((sum, r) => sum + (r.addRowSuccessRate || 0), 0) / totalSimulations : 0,
      overallAverageReachableMatchScore: totalSimulations ? all.reduce((sum, r) => sum + (r.averageReachableMatchScore || 0), 0) / totalSimulations : 0,
      overallAverageProjectedWinScore: totalSimulations ? all.reduce((sum, r) => sum + (r.averageProjectedWinScore || 0), 0) / totalSimulations : 0,
      overallAverageBoardAwareHelpfulnessScore: totalSimulations ? all.reduce((sum, r) => sum + (r.averageBoardAwareHelpfulnessScore || 0), 0) / totalSimulations : 0,
      overallCriticalStuckRate: totalSimulations ? all.reduce((sum, r) => sum + (r.criticalStuckRate || 0), 0) / totalSimulations : 0,
      overallAverageDiversityScore: totalSimulations ? all.reduce((sum, r) => sum + (r.averageDiversityScore || 0), 0) / totalSimulations : 0,
      overallAveragePairDiversityScore: totalSimulations ? all.reduce((sum, r) => sum + (r.averagePairDiversityScore || 0), 0) / totalSimulations : 0,
      overallAverageInitialReachablePairs: totalSimulations ? all.reduce((sum, r) => sum + (r.initialReachablePairs || 0), 0) / totalSimulations : 0,
      overallAverageSolutionGraphBranchingFactor: totalSimulations ? all.reduce((sum, r) => sum + (r.solutionGraphBranchingFactor || 0), 0) / totalSimulations : 0,
      overallAverageDeadlockFrequency: totalSimulations ? all.reduce((sum, r) => sum + (r.deadlockFrequency || 0), 0) / totalSimulations : 0,
      overallAverageAddRowDependencyScore: totalSimulations ? all.reduce((sum, r) => sum + (r.addRowDependencyScore || 0), 0) / totalSimulations : 0,
      overallOrphanDigitCount: all.filter(r => !r.completed && r.remainingNumbersAtFailure <= 2).length,
      overallRescueTriggerRate: totalSimulations ? all.reduce((sum, r) => sum + (r.rescueModeTriggered ? 1 : 0), 0) / totalSimulations : 0,
      overallAverageBoardDiversityScore: totalSimulations ? all.reduce((sum, r) => sum + (r.boardDiversityScore || 0), 0) / totalSimulations : 0,
      overallDigitFrequencyDistribution: digitDist,
      overallMostCommonGeneratedNumbers,
      overallAverageScore: totalSimulations ? all.reduce((sum, r) => sum + r.score, 0) / totalSimulations : 0,
      mostDifficultLevel,
      easiestLevel,
      highestRescueRateLevel,
      highestAddRowUsageLevel,
      overallRescueModeTriggerCount: all.reduce((sum, r) => sum + (r.rescueModeTriggered ? 1 : 0), 0),
      overallWinsWithRescue: all.reduce((sum, r) => sum + (r.wonWithRescue ? 1 : 0), 0),
      overallWinsWithoutRescue: all.reduce((sum, r) => sum + (r.wonWithoutRescue ? 1 : 0), 0),
      overallOneNumberFailureRate: 0,
      overallTwoNumberFailureRate: 0,
      overallThreeNumberFailureRate: 0,
      overallRescueSuccessRate: 0,
      overallAverageRemainingNumbersAtFailure: 0
    };
  }

  public validateSawtoothDifficulty(): SawtoothValidationResult {
    const levels = Array.from(new Set(this.db.getAllResults().map(r => r.level))).sort((a,b) => a - b);
    if (levels.length === 0) {
      return { passed: false, message: "No levels simulated." };
    }

    const maxLevel = levels[levels.length - 1];
    
    const getAvgWinRate = (start: number, end: number) => {
      let sum = 0;
      let count = 0;
      for (let l = start; l <= end; l++) {
        if (levels.includes(l)) {
          sum += this.getLevelAnalytics(l).completionRate;
          count++;
        }
      }
      return count > 0 ? sum / count : 1; // Default 1 if missing
    };

    const earlyWinRate = getAvgWinRate(1, Math.min(4, maxLevel));
    const midWinRate = maxLevel >= 5 ? getAvgWinRate(5, Math.min(7, maxLevel)) : null;
    const lateWinRate = maxLevel >= 8 ? getAvgWinRate(8, Math.min(10, maxLevel)) : null;

    let passed = true;
    let messageParts = [];

    if (midWinRate !== null) {
      const earlyIsEasier = earlyWinRate >= midWinRate;
      passed = passed && earlyIsEasier;
      messageParts.push(`Early(>Mid)=${earlyIsEasier}`);
    }

    if (lateWinRate !== null) {
      const midIsEasier = (midWinRate ?? earlyWinRate) >= lateWinRate;
      passed = passed && midIsEasier;
      messageParts.push(`Mid(>Late)=${midIsEasier}`);
    }

    if (messageParts.length === 0) {
      return { passed: true, message: "Not enough levels to validate progression." };
    }

    return {
      passed,
      message: `Sawtooth Validation ${passed ? 'PASSED' : 'FAILED'}: ${messageParts.join(' ')}`
    };
  }
}
