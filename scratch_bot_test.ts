import { GameBot } from "./src/testing/gameBot.ts";
import { SmartBot } from "./src/testing/botStrategies.ts";

async function run() {
  let zeroAddRows = 0;
  for (let i = 1; i <= 10; i++) {
    const bot = new GameBot(new SmartBot(), "Smart");
    const result = await bot.play(i, 1, i);
    console.log(`Sim ${i}: Completed=${result.completed}, AddRows=${result.addRowsUsed}, Remaining=${result.remainingNumbers || 0}`);
  }
}

run();
