import { BoardEngine } from "./boardEngine.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";
import { LevelGenerator } from "./levelGenerator.ts";
import { SimulationEngine } from "./simulationEngine.ts";
import type {
  AddRowValidationReport,
  BoardValidationReport,
  CompletionValidationReport,
  DifficultyDistributionReport,
  DifficultyStats,
  FinalCalibrationReport,
  LevelData,
  SawtoothReport
} from "./models.ts";

export class StatisticalValidationFramework {
  private levels: LevelGenerator;
  private difficulty: DifficultyEngine;
  private simulation: SimulationEngine;

  constructor(levels = new LevelGenerator(), difficulty = new DifficultyEngine(), simulation = new SimulationEngine()) {
    this.levels = levels;
    this.difficulty = difficulty;
    this.simulation = simulation;
  }

  validateBoards(levels = [1, 3, 5, 10], count = 10000, tolerance = 15): BoardValidationReport {
    const reports = levels.map((level) => {
      const scores: number[] = [];
      let solvable = 0;
      let deterministic = 0;
      let addRowBudgetRespected = 0;

      for (let attempt = 1; attempt <= count; attempt++) {
        const a = this.levels.generateLevel(level, attempt);
        const b = this.levels.generateLevel(level, attempt);
        const board = new BoardEngine(a.board);
        const score = a.difficultyScore;
        const profile = this.difficulty.getDifficultyProfile(level);
        scores.push(score);
        if (this.levels.validateLevel(a) && board.findAllValidPairs().length > 0) solvable++;
        if (JSON.stringify(a) === JSON.stringify(b)) deterministic++;
        if (score >= profile.scoreRange[0] - tolerance && score <= profile.scoreRange[1] + tolerance) addRowBudgetRespected++;
      }

      const failed = count - Math.min(solvable, deterministic, addRowBudgetRespected);
      return {
        level,
        generated: count,
        solvable,
        deterministic,
        failed,
        difficultyMean: mean(scores),
        difficultyStdDev: stdDev(scores),
        addRowBudgetRespected
      };
    });

    return { levels: reports, passed: reports.every((r) => r.failed === 0) };
  }

  validateDifficultyDistribution(levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], count = 1000): DifficultyDistributionReport {
    const stats = levels.map((level) => this.calculateDifficultyStats(level, count));
    const byLevel = new Map(stats.map((s) => [s.level, s.mean]));
    const level10GreaterThan9GreaterThan8 = (byLevel.get(10) ?? 0) > (byLevel.get(9) ?? 0) && (byLevel.get(9) ?? 0) > (byLevel.get(8) ?? 0);
    const level6EasierThan5 = (byLevel.get(6) ?? 0) < (byLevel.get(5) ?? 0);
    const level11EasierThan10 = (byLevel.get(11) ?? 0) < (byLevel.get(10) ?? 0);
    const passed = level10GreaterThan9GreaterThan8 && level6EasierThan5 && level11EasierThan10;
    return { stats, level10GreaterThan9GreaterThan8, level6EasierThan5, level11EasierThan10, passed };
  }

  validateAddRowUsage(levels = [1, 3, 5, 10], count = 10000): AddRowValidationReport {
    const reports = levels.map((level) => {
      const report = this.simulation.simulateBatch(level, count);
      const targetRange = targetAddRowsFor(level);
      const passed = report.averageAddRowsUsed >= targetRange[0] && report.averageAddRowsUsed <= targetRange[1];
      return { level, simulations: count, averageAddRowsUsed: report.averageAddRowsUsed, targetRange, passed };
    });
    return { levels: reports, passed: reports.every((r) => r.passed) };
  }

  validateCompletionRates(levels = [1, 3, 5, 10], count = 10000, requiredRate = 0.95): CompletionValidationReport {
    const reports = levels.map((level) => {
      const report = this.simulation.simulateBatch(level, count);
      const passed = report.completionRate >= requiredRate;
      return { level, simulations: count, completionRate: report.completionRate, requiredRate, passed };
    });
    return { levels: reports, passed: reports.every((r) => r.passed) };
  }

  validateSawtooth(count = 1000): SawtoothReport {
    const stats = this.validateDifficultyDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], count).stats;
    const means: Record<string, number> = {};
    for (const stat of stats) means[stat.level.toString()] = stat.mean;
    const firstRamp = means["1"] < means["2"] && means["2"] < means["3"] && means["3"] < means["4"] && means["4"] < means["5"];
    const firstDrop = means["6"] < means["5"];
    const secondRamp = means["7"] < means["8"] && means["8"] < means["9"] && means["9"] < means["10"];
    const secondDrop = means["11"] < means["10"];
    return { firstRamp, firstDrop, secondRamp, secondDrop, passed: firstRamp && firstDrop && secondRamp && secondDrop, means };
  }

  generateCalibrationReport(options: { boardCount?: number; distributionCount?: number; simulationCount?: number } = {}): FinalCalibrationReport {
    const boardValidation = this.validateBoards([1, 3, 5, 10], options.boardCount ?? 10000);
    const difficultyDistribution = this.validateDifficultyDistribution(undefined, options.distributionCount ?? 1000);
    const addRowUsage = this.validateAddRowUsage(undefined, options.simulationCount ?? 10000);
    const completionRate = this.validateCompletionRates(undefined, options.simulationCount ?? 10000);
    const sawtooth = this.validateSawtooth(options.distributionCount ?? 1000);
    const levelMetrics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => this.simulation.simulateBatch(level, options.simulationCount ?? 1000));
    return {
      boardValidation,
      difficultyDistribution,
      addRowUsage,
      completionRate,
      sawtooth,
      levelMetrics,
      passed: boardValidation.passed && difficultyDistribution.passed && addRowUsage.passed && completionRate.passed && sawtooth.passed
    };
  }

  exportJson(report: FinalCalibrationReport): string {
    return JSON.stringify(report, null, 2);
  }

  exportCsv(report: FinalCalibrationReport): string {
    const rows = ["section,level,metric,value,passed"];
    for (const r of report.boardValidation.levels) rows.push(`board,${r.level},failed,${r.failed},${r.failed === 0}`);
    for (const r of report.difficultyDistribution.stats) rows.push(`difficulty,${r.level},mean,${r.mean},`);
    for (const r of report.addRowUsage.levels) rows.push(`add_rows,${r.level},average,${r.averageAddRowsUsed},${r.passed}`);
    for (const r of report.completionRate.levels) rows.push(`completion,${r.level},rate,${r.completionRate},${r.passed}`);
    rows.push(`sawtooth,all,passed,${report.sawtooth.passed},${report.sawtooth.passed}`);
    return rows.join("\n");
  }

  exportMarkdown(report: FinalCalibrationReport): string {
    const lines = ["# Final Calibration Report", "", `Passed: ${report.passed}`, "", "## Board Validation"];
    for (const r of report.boardValidation.levels) lines.push(`- Level ${r.level}: generated ${r.generated}, solvable ${r.solvable}, failed ${r.failed}, mean ${round(r.difficultyMean)}`);
    lines.push("", "## Difficulty Distribution");
    for (const r of report.difficultyDistribution.stats) lines.push(`- Level ${r.level}: mean ${round(r.mean)}, median ${round(r.median)}, stddev ${round(r.stdDev)}`);
    lines.push("", "## Add Row Usage");
    for (const r of report.addRowUsage.levels) lines.push(`- Level ${r.level}: average ${round(r.averageAddRowsUsed)}, target ${r.targetRange[0]}-${r.targetRange[1]}, passed ${r.passed}`);
    lines.push("", "## Completion Rate");
    for (const r of report.completionRate.levels) lines.push(`- Level ${r.level}: ${round(r.completionRate * 100)}%, passed ${r.passed}`);
    lines.push("", "## Sawtooth", `Passed: ${report.sawtooth.passed}`);
    lines.push("", "## Level Validation Metrics");
    for (const m of report.levelMetrics) {
        lines.push(`### Level ${m.level}`);
        lines.push(`- Win Rate: ${round(m.completionRate * 100)}%`);
        lines.push(`- Avg Add Rows: ${round(m.averageAddRowsUsed)}`);
        lines.push(`- Completion Time: ${round(m.averageCompletionTime)} moves`);
        lines.push(`- Reachable Pairs: ${round(m.averageReachablePairs)}`);
        lines.push(`- Diversity Score: ${round(m.averageDiversityScore * 100)}%`);
        lines.push(`- Deadlock Rate: ${round(m.averageDeadlockFrequency * 100)}%`);
        lines.push(`- Rescue Trigger Rate: ${round(m.rescueTriggerRate * 100)}%`);
        lines.push(`- Branching Factor: ${round(m.averageBranchingFactor)}`);
        lines.push(`- Orphan Digit Count: ${round(m.averageOrphanDigitCount)}`);
    }
    return lines.join("\n");
  }

  private calculateDifficultyStats(level: number, count: number): DifficultyStats {
    const scores: number[] = [];
    for (let attempt = 1; attempt <= count; attempt++) scores.push(this.levels.generateLevel(level, attempt).difficultyScore);
    return { level, mean: mean(scores), median: median(scores), stdDev: stdDev(scores) };
  }
}

function targetAddRowsFor(level: number): [number, number] {
  if (level === 1) return [0.5, 1.5];
  if (level === 10) return [4, 6];
  return [2, 3];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : mean([sorted[middle - 1] ?? 0, sorted[middle] ?? 0]);
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
