import { GameBot } from "./src/testing/gameBot.ts";
import { SmartBot } from "./src/testing/botStrategies.ts";
import { SimulationHistoryDatabase } from "./src/testing/botMetrics.ts";
import { BotRunner } from "./src/testing/botRunner.ts";

async function run() {
  const runner = new BotRunner();
  await runner.runBatch("Smart", 100, [1]);
  const db = runner.getAnalytics()['db'];
  const results = db.getAllResults();
  
  for (const r of results) {
    if (r.completed && r.addRowsUsed === 0) {
      console.log(`FOUND BUG! Simulation ${r.simulationId} completed with 0 add rows.`);
    }
  }
  console.log("Done checking 100 simulations.");
}

run();
