import { BotRunner } from "./botRunner.ts";
import { RescueMode } from "./gameBot.ts";

async function main() {
  const runner = new BotRunner();
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(`Running Board-Aware Engine Validation (1000 sims/level) in PRODUCTION Mode...`);
  
  await runner.runBatch("Smart", 1000, levels, undefined, { rescueMode: RescueMode.PRODUCTION });
  
  const analytics = runner.getAnalytics();
  
  console.log(`\n=== BOARD-AWARE ENGINE REPORT ===`);
  console.log(`Level | Win Rate | Avg Add Rows | Avg Time | Board-Aware Score | Reachable Matches`);
  console.log(`------|----------|--------------|----------|-------------------|------------------`);
  
  for (let l = 1; l <= 10; l++) {
      const stats = analytics.getLevelAnalytics(l);
      const winRate = (stats.completionRate * 100).toFixed(1).padStart(7) + '%';
      const addRows = stats.averageAddRows.toFixed(2).padStart(12);
      const time = stats.averageCompletionTime.toFixed(1).padStart(7) + 's';
      const boardAwareScore = stats.averageBoardAwareHelpfulnessScore.toFixed(2).padStart(17);
      const reachableMatches = stats.averageReachableMatchScore.toFixed(2).padStart(17);

      console.log(`  ${l.toString().padStart(2)}  | ${winRate} | ${addRows} | ${time} | ${boardAwareScore} | ${reachableMatches}`);
  }
  
  const global = analytics.getGlobalAnalytics();
  console.log(`\nGlobal Average Board-Aware Helpfulness Score: ${global.overallAverageBoardAwareHelpfulnessScore.toFixed(2)}`);
  console.log(`Global Average Reachable Match Score: ${global.overallAverageReachableMatchScore.toFixed(2)}`);
  console.log(`Global Win Rate: ${(global.overallCompletionRate * 100).toFixed(1)}%`);
  console.log(`=================================\n`);
}

main().catch(console.error);
