import { DifficultyEngine } from "./difficultyEngine.ts";
import { SimulationEngine } from "./simulationEngine.ts";
import type { DifficultyProfile, SimulationReport, TuningReport } from "./models.ts";

export class AutoTuningEngine {
  private simulation: SimulationEngine;
  private difficulty: DifficultyEngine;

  constructor(simulation = new SimulationEngine(), difficulty = new DifficultyEngine()) {
    this.simulation = simulation;
    this.difficulty = difficulty;
  }

  tuneLevel(level: number, maxIterations = 5): TuningReport {
    let report: SimulationReport = this.simulation.simulateBatch(level, 60);
    let adjustments: Partial<DifficultyProfile> = {};
    let iterations = 1;

    while (!this.evaluateTargets(level, report) && iterations < maxIterations) {
      adjustments = this.applyDifficultyAdjustments(level, report);
      report = this.simulation.simulateBatch(level, 60);
      iterations++;
    }

    return {
      level,
      iterations,
      converged: this.evaluateTargets(level, report),
      adjustments,
      finalCompletionRate: report.completionRate,
      finalAverageAddRows: report.averageAddRowsUsed
    };
  }

  tuneAllLevels(levels = [1, 3, 5, 10]): TuningReport[] {
    return levels.map((level) => this.tuneLevel(level));
  }

  applyDifficultyAdjustments(level: number, report: SimulationReport): Partial<DifficultyProfile> {
    const profile = this.difficulty.getDifficultyProfile(level);
    const easier = report.completionRate < 0.95;
    return {
      matchDensity: this.clamp(profile.matchDensity + (easier ? 0.05 : -0.02), 0.1, 0.8),
      decoyDensity: this.clamp(profile.decoyDensity + (easier ? -0.05 : 0.02), 0.05, 0.5),
      helperRatio: this.clamp(profile.helperRatio + (easier ? 0.05 : -0.02), 0.1, 0.75),
      chainDepth: Math.max(1, profile.chainDepth + (easier ? -1 : 0))
    };
  }

  evaluateTargets(level: number, report: SimulationReport): boolean {
    const targetRows = level === 10 ? [4, 6] : level === 1 ? [0.5, 2] : [1.5, 3.5];
    return report.completionRate >= 0.95
      && report.averageAddRowsUsed >= targetRows[0]
      && report.averageAddRowsUsed <= targetRows[1];
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
