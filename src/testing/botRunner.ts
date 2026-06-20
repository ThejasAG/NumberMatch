import { GameBot } from "./gameBot.ts";
import { GreedyBot, SmartBot, HumanLikeBot } from "./botStrategies.ts";
import { SimulationHistoryDatabase } from "./botMetrics.ts";
import { BotAnalytics } from "./botAnalytics.ts";
import { BotReportGenerator } from "./botReportGenerator.ts";
// fs and path will be dynamically imported for CLI usage

export interface ProgressState {
  current: number;
  total: number;
  completionRate: number;
  avgTime: number;
  avgAddRows: number;
  avgScore: number;
}

export class BotRunner {
  private db = new SimulationHistoryDatabase();
  private analytics = new BotAnalytics(this.db);
  private reportGen = new BotReportGenerator(this.analytics);

  public async runBatch(
    botType: "Greedy" | "Smart" | "Human-like", 
    count: number, 
    levels: number[],
    onProgress?: (progress: ProgressState) => void,
    options?: { difficultyEngine?: import("../difficultyEngine.ts").DifficultyEngine, rescueMode?: import("./gameBot.ts").RescueMode }
  ): Promise<void> {
    const strategy = this.getStrategy(botType);
    const bot = new GameBot(strategy, botType, options);
    
    let simulationId = 1;
    const totalRuns = count * levels.length;

    for (const level of levels) {
      for (let attempt = 1; attempt <= count; attempt++) {
        const result = await bot.play(simulationId++, level, attempt);
        this.db.addResult(result);
        
        if (onProgress) {
          const global = this.analytics.getGlobalAnalytics();
          onProgress({
            current: simulationId - 1,
            total: totalRuns,
            completionRate: global.overallCompletionRate,
            avgTime: global.overallAverageCompletionTime,
            avgAddRows: global.overallAverageAddRows,
            avgScore: global.overallAverageScore
          });
        }
        
        // Yield to allow React UI updates
        if (simulationId % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
  }

  public async runComparative(
    count: number, 
    levels: number[],
    onProgress?: (progress: ProgressState) => void
  ): Promise<void> {
    const bots = [
      new GameBot(new GreedyBot(), "Greedy"),
      new GameBot(new SmartBot(), "Smart"),
      new GameBot(new HumanLikeBot(), "Human-like")
    ];

    let simulationId = 1;
    const totalRuns = count * levels.length * bots.length;

    for (const level of levels) {
      for (let attempt = 1; attempt <= count; attempt++) {
        for (const bot of bots) {
          const result = await bot.play(simulationId++, level, attempt);
          this.db.addResult(result);

          if (onProgress) {
            const global = this.analytics.getGlobalAnalytics();
            onProgress({
              current: simulationId - 1,
              total: totalRuns,
              completionRate: global.overallCompletionRate,
              avgTime: global.overallAverageCompletionTime,
              avgAddRows: global.overallAverageAddRows,
              avgScore: global.overallAverageScore
            });
          }

          if (simulationId % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    }
  }

  public async runRegressionSuite(onProgress?: (progress: ProgressState) => void): Promise<void> {
    await this.runBatch("Smart", 100, [1, 3, 5, 10], onProgress);
  }

  public async runDifficultyValidationSuite(onProgress?: (progress: ProgressState) => void): Promise<void> {
    await this.runBatch("Smart", 50, [1,2,3,4,5,6,7,8,9,10,11], onProgress);
  }

  public async generateReports(options: { json?: boolean; csv?: boolean; markdown?: boolean }) {
    // In a browser environment, fs doesn't work. We wrap it in a try-catch for CLI usage.
    try {
      if (typeof window !== "undefined") {
        console.warn("generateReports is not supported in the browser.");
        return;
      }
      // @ts-ignore
      const fs = await import("fs");
      // @ts-ignore
      const path = await import("path");

      const dir = path.join(process.cwd(), "reports");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (options.json) {
        fs.writeFileSync(path.join(dir, "final-report.json"), this.reportGen.generateJSON());
      }
      if (options.csv) {
        fs.writeFileSync(path.join(dir, "final-report.csv"), this.reportGen.generateCSV());
      }
      if (options.markdown) {
        fs.writeFileSync(path.join(dir, "final-report.md"), this.reportGen.generateMarkdown());
        
        const levels = Array.from(new Set(this.db.getAllResults().map(r => r.level)));
        for (const level of levels) {
          fs.writeFileSync(path.join(dir, `level${level}-report.md`), this.reportGen.generateLevelMarkdown(level));
        }
      }
    } catch (e) {
      console.warn("generateReports is only fully supported in a Node.js CLI environment.", e);
    }
  }

  public getAnalytics() {
    return this.analytics;
  }
  
  public getReportGenerator() {
    return this.reportGen;
  }
  
  public getDatabase() {
    return this.db;
  }

  private getStrategy(botType: string) {
    if (botType === "Greedy") return new GreedyBot();
    if (botType === "Smart") return new SmartBot();
    return new HumanLikeBot();
  }
}
