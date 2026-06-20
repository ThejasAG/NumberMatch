import { BotRunner } from "./botRunner.ts";

async function main() {
  console.log("Running 1000 Simulations for Level 1 Endgame Validation...");
  const runner = new BotRunner();
  await runner.runBatch("Smart", 1000, [1]);
  
  const analytics = runner.getAnalytics().getLevelAnalytics(1);
  
  console.log(`\n=== ENDGAME VALIDATION RESULTS ===`);
  console.log(`Win Rate: ${(analytics.completionRate * 100).toFixed(1)}%`);
  console.log(`Avg Add Rows: ${analytics.averageAddRows.toFixed(2)}`);
  console.log(`Critical Stuck Rate: ${(analytics.criticalStuckRate * 100).toFixed(1)}%`);
  console.log(`One Number Failure Rate: ${(analytics.oneNumberFailureRate * 100).toFixed(1)}%`);
  console.log(`Rescue Efficiency: ${(analytics.rescueSuccessRate * 100).toFixed(1)}%`);
  console.log(`Rescue Triggers: ${analytics.rescueModeTriggerCount}`);
  console.log(`==================================\n`);
}

main().catch(console.error);
