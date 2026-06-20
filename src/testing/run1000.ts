import { BotRunner } from "./botRunner.ts";

async function run() {
  const runner = new BotRunner();
  console.log("Starting 1000 simulations for levels 1, 3, 5, 10...");
  await runner.runBatch("Smart", 1000, [1, 3, 5, 10]);
  
  const analytics = runner.getAnalytics();
  
  for (const level of [1, 3, 5, 10]) {
    const data = analytics.getLevelAnalytics(level);
    console.log(`\n=== LEVEL ${level} ===`);
    console.log(`Completion Rate: ${(data.completionRate * 100).toFixed(1)}%`);
    console.log(`Avg Add Rows:    ${data.averageAddRows.toFixed(2)}`);
    console.log(`Reachable Match: ${data.averageReachableMatchScore.toFixed(2)}`);
    console.log(`Critical Stuck:  ${(data.criticalStuckRate * 100).toFixed(1)}%`);
    console.log(`Diversity:       ${data.averageDiversityScore.toFixed(1)}%`);
  }
}

run().catch(console.error);
