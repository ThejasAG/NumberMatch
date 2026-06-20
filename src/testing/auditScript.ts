import { BotRunner } from "./botRunner.ts";
import { DifficultyEngine } from "../difficultyEngine.ts";

async function main() {
  const runner = new BotRunner();
  // We need to run 1-11 for Sawtooth to pass
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  console.log(`Running Audit Simulations on Levels 1-11 for Greedy Bot...`);
  
  await runner.runBatch("Greedy", 100, levels);
  
  const analytics = runner.getAnalytics();
  
  for (let l = 1; l <= 11; l++) {
      const levelStats = analytics.getLevelAnalytics(l);
      console.log(`\n--- Level ${l} ---`);
      console.log(`Win Rate: ${(levelStats.completionRate * 100).toFixed(1)}%`);
      console.log(`Avg Add Rows: ${levelStats.averageAddRows.toFixed(2)}`);
      console.log(`Avg Time: ${levelStats.averageCompletionTime.toFixed(1)}s`);
      console.log(`Rescue Usage: ${levelStats.rescueModeTriggerCount} triggers`);
  }
  
  const sawtooth = analytics.validateSawtoothDifficulty();
  console.log(`\nSawtooth Validation: ${sawtooth.passed ? 'PASS' : 'FAIL'} (${sawtooth.message})`);

  console.log(`\n--- Difficulty Engine Verification ---`);
  const diffEngine = new DifficultyEngine();
  for (const l of [1, 5, 10]) {
      const p = diffEngine.getDifficultyProfile(l);
      console.log(`Level ${l} -> Match Density: ${p.matchDensity.toFixed(2)} | Decoy Density: ${p.decoyDensity.toFixed(2)} | Pair Distance: ${p.pairDistance}`);
  }

  const global = analytics.getGlobalAnalytics();
  console.log(`\n--- Endgame Recovery Global ---`);
  console.log(`Total Rescues Triggered: ${global.overallRescueModeTriggerCount}`);
  console.log(`Total Rescue Success Rate: ${(global.overallRescueSuccessRate * 100).toFixed(1)}%`);
}

main().catch(console.error);
