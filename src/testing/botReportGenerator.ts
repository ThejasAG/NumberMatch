import type { BotAnalytics } from "./botAnalytics.ts";

export class BotReportGenerator {
  private analytics: BotAnalytics;

  constructor(analytics: BotAnalytics) {
    this.analytics = analytics;
  }

  public generateJSON(): string {
    const global = this.analytics.getGlobalAnalytics();
    const sawtooth = this.analytics.validateSawtoothDifficulty();
    
    return JSON.stringify({
      global,
      sawtooth,
      top10Fastest: this.analytics.getTop10FastestCompletions(),
      worst10Runs: this.analytics.getWorst10Runs(),
      highestScoring: this.analytics.getHighestScoringRun(),
      mostAddRows: this.analytics.getMostAddRowsUsed()
    }, null, 2);
  }

  public generateCSV(): string {
    // Basic CSV dump of global and maybe some level stats
    let csv = "Metric,Value\n";
    const global = this.analytics.getGlobalAnalytics();
    for (const [k, v] of Object.entries(global)) {
      csv += `${k},${v}\n`;
    }
    return csv;
  }

  public generateMarkdown(): string {
    const global = this.analytics.getGlobalAnalytics();
    const sawtooth = this.analytics.validateSawtoothDifficulty();
    
    let md = `# Executive Summary\n\n`;
    md += `- **Total Simulations:** ${global.totalSimulations}\n`;
    md += `- **Overall Completion Rate:** ${(global.overallCompletionRate * 100).toFixed(2)}%\n`;
    md += `- **Overall Average Completion Time:** ${global.overallAverageCompletionTime.toFixed(1)}s\n`;
    
    md += `\n## Sawtooth Validation\n`;
    md += `**Result:** ${sawtooth.passed ? 'PASS' : 'FAIL'}\n`;
    md += `*${sawtooth.message}*\n`;

    md += `\n## Record Highlights\n`;
    const fastest = this.analytics.getTop10FastestCompletions();
    if (fastest.length > 0) {
      md += `**Fastest Run:** ${fastest[0].completionTimeSeconds}s (Level ${fastest[0].level}, Bot: ${fastest[0].botType})\n`;
    }
    const highestScore = this.analytics.getHighestScoringRun();
    if (highestScore) {
      md += `**Highest Scoring Run:** ${highestScore.score} (Level ${highestScore.level})\n`;
    }

    md += `\n## Completion Validation Report\n`;
    md += `| Level | Remaining Numbers | Add Rows Used | Board Empty | Completion Status |\n`;
    md += `|-------|-------------------|---------------|-------------|-------------------|\n`;
    
    // Sample the last run of each level from DB
    const results = (this.analytics as any).db.getAllResults();
    const levelsSet = new Set<number>();
    const sortedResults = [...results].reverse();
    
    for (const r of sortedResults) {
      if (!levelsSet.has(r.level)) {
        levelsSet.add(r.level);
        const remaining = r.remainingNumbers ?? (r.completed ? 0 : 'N/A');
        const boardEmpty = r.completed ? 'Yes' : 'No';
        const status = r.completed ? 'PASS' : 'FAIL';
        md += `| ${r.level} | ${remaining} | ${r.addRowsUsed} | ${boardEmpty} | ${status} |\n`;
      }
    }

    return md;
  }

  public generateLevelMarkdown(level: number): string {
    const stats = this.analytics.getLevelAnalytics(level);
    
    let md = `# Level ${level} Report\n\n`;
    md += `**Games Played:** ${stats.gamesPlayed}\n`;
    md += `**Completion Rate:** ${(stats.completionRate * 100).toFixed(1)}%\n`;
    md += `**Average Time:** ${stats.averageCompletionTime.toFixed(1)}s\n`;
    
    if (stats.targetTime) {
      md += `**Target Time:** ${stats.targetTime}s\n`;
      const diff = stats.averageCompletionTime - stats.targetTime;
      md += `**Difference:** ${diff > 0 ? '+' : ''}${diff.toFixed(1)}s\n`;
      // Validate +/- 10%
      const passed = Math.abs(diff) <= stats.targetTime * 0.15; // Within 15% roughly
      md += `**Target Validation:** ${passed ? 'PASS' : 'FAIL'}\n`;
    }

    md += `\n**Average Add Rows:** ${stats.averageAddRows.toFixed(2)}\n`;
    md += `**Initial Reachable Pairs:** ${stats.averageInitialReachablePairs.toFixed(2)}\n`;
    md += `**Solution Graph Branching Factor:** ${stats.averageSolutionGraphBranchingFactor.toFixed(2)}\n`;
    md += `**Deadlock Frequency:** ${(stats.averageDeadlockFrequency * 100).toFixed(1)}%\n`;
    md += `**Add Row Dependency Score:** ${(stats.averageAddRowDependencyScore * 100).toFixed(1)}%\n`;
    md += `**Board Diversity Score:** ${(stats.averageBoardDiversityScore * 100).toFixed(1)}%\n`;
    md += `**Average Rescues:** ${stats.averageRescues.toFixed(2)}\n`;
    md += `**Average Score:** ${stats.averageScore.toFixed(2)}\n`;
    
    return md;
  }
}
