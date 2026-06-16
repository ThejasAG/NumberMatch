import type { AnalyticsReport, SimulationReport, SimulationResult } from "./models.ts";

export class AnalyticsEngine {
  private sessions: SimulationResult[] = [];
  private matchDensities: number[] = [];

  recordGameSession(session: SimulationResult, matchDensity = 0): void {
    this.sessions.push(session);
    this.matchDensities.push(matchDensity);
  }

  recordSimulation(report: SimulationReport): void {
    for (const result of report.results) this.recordGameSession(result);
  }

  generateReport(): AnalyticsReport {
    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    const wins = this.sessions.filter((s) => s.won).length;
    const distribution: Record<string, number> = {};
    for (const session of this.sessions) {
      const key = session.level.toString();
      distribution[key] = (distribution[key] ?? 0) + 1;
    }
    return {
      sessions: this.sessions.length,
      completionRate: wins / Math.max(1, this.sessions.length),
      averageCompletionTime: avg(this.sessions.map((s) => s.moves + s.addRowsUsed)),
      averageMoves: avg(this.sessions.map((s) => s.moves)),
      averageAddRowsUsed: avg(this.sessions.map((s) => s.addRowsUsed)),
      averageBoardHeight: avg(this.sessions.map((s) => s.maxBoardHeight)),
      averageRescueActivations: avg(this.sessions.map((s) => s.rescueActivations)),
      averageMatchDensity: avg(this.matchDensities),
      difficultyDistribution: distribution
    };
  }

  exportCsv(): string {
    const rows = ["level,bot,won,moves,addRowsUsed,rescueActivations,maxBoardHeight"];
    for (const s of this.sessions) rows.push(`${s.level},${s.bot},${s.won},${s.moves},${s.addRowsUsed},${s.rescueActivations},${s.maxBoardHeight}`);
    return rows.join("\n");
  }

  exportJson(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }
}
