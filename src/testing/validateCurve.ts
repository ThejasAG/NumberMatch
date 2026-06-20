import { BotRunner } from "./botRunner.ts";
import { RescueMode } from "./gameBot.ts";

async function main() {
  const runner = new BotRunner();
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(`Running Difficulty Curve Validation (1000 sims/level) in PRODUCTION Mode...`);
  
  await runner.runBatch("Smart", 1000, levels, undefined, { rescueMode: RescueMode.PRODUCTION });
  
  const analytics = runner.getAnalytics();
  
  console.log(`\n=== DIFFICULTY CURVE REPORT ===`);
  console.log(`Level | Win Rate | Avg Add Rows | Avg Time | Rescue Usage | Wins With Rescue | Wins W/O Rescue`);
  console.log(`------|----------|--------------|----------|--------------|------------------|-----------------`);
  
  for (let l = 1; l <= 10; l++) {
      const stats = analytics.getLevelAnalytics(l);
      const winRate = (stats.completionRate * 100).toFixed(1).padStart(7) + '%';
      const addRows = stats.averageAddRows.toFixed(2).padStart(12);
      const time = stats.averageCompletionTime.toFixed(1).padStart(7) + 's';
      const rescueUsage = (stats.rescueModeTriggerCount).toString().padStart(12);
      const winsWithRescue = (stats.winsWithRescue).toString().padStart(16);
      const winsWithoutRescue = (stats.winsWithoutRescue).toString().padStart(15);

      console.log(`  ${l.toString().padStart(2)}  | ${winRate} | ${addRows} | ${time} | ${rescueUsage} | ${winsWithRescue} | ${winsWithoutRescue}`);
  }
  
  const sawtooth = analytics.validateSawtoothDifficulty();
  console.log(`\nSawtooth Validation: ${sawtooth.passed ? 'PASS' : 'FAIL'} (${sawtooth.message})`);
  console.log(`===============================\n`);
}

main().catch(console.error);
