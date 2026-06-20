import * as readline from "readline";
import { BotRunner } from "./botRunner.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function main() {
  const runner = new BotRunner();

  // If arguments provided, run in non-interactive mode
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const cmd = args[0];
    console.log(`Running in CLI mode: ${cmd}`);
    if (cmd === "greedy") await runner.runBatch("Greedy", 100, [1, 5, 10]);
    else if (cmd === "smart") await runner.runBatch("Smart", 100, [1, 5, 10]);
    else if (cmd === "human") await runner.runBatch("Human-like", 100, [1, 5, 10]);
    else if (cmd === "compare") await runner.runComparative(100, [1, 5, 10]);
    else if (cmd === "stress") await runner.runBatch("Smart", 10000, [5]);
    else if (cmd === "validate") await runner.runDifficultyValidationSuite();
    
    runner.generateReports({ markdown: true, json: true, csv: true });
    console.log("Done! Reports generated in reports/ folder.");
    process.exit(0);
  }

  console.log("================================");
  console.log("      NUMBER MATCH TEST BOT     ");
  console.log("================================");
  console.log("Select Mode:");
  console.log("1. Single Level");
  console.log("2. Level Range");
  console.log("3. All Levels");
  console.log("4. Regression Test Suite");
  console.log("5. Difficulty Validation Suite");
  console.log("================================");

  const mode = await question("Enter mode (1-5): ");

  let levels: number[] = [];
  if (mode === "1") {
    const l = await question("Enter Level (e.g. 5): ");
    levels = [parseInt(l)];
  } else if (mode === "2") {
    const start = await question("Enter Start Level: ");
    const end = await question("Enter End Level: ");
    for (let i = parseInt(start); i <= parseInt(end); i++) levels.push(i);
  } else if (mode === "3") {
    levels = [1,2,3,4,5,6,7,8,9,10,11];
  } else if (mode === "4") {
    console.log("Running Regression Suite...");
    await runner.runRegressionSuite();
    runner.generateReports({ markdown: true, json: true, csv: true });
    console.log("Done! Reports generated.");
    process.exit(0);
  } else if (mode === "5") {
    console.log("Running Difficulty Validation Suite...");
    await runner.runDifficultyValidationSuite();
    runner.generateReports({ markdown: true, json: true, csv: true });
    console.log("Done! Reports generated.");
    process.exit(0);
  }

  console.log("\nSelect Bot Type:");
  console.log("1. Greedy Bot");
  console.log("2. Smart Bot");
  console.log("3. Human-like Bot");
  console.log("4. Comparative Mode");
  console.log("5. Stress Test Mode (10,000+ runs)");
  const botChoice = await question("Enter bot type (1-5): ");

  let count = 100;
  if (botChoice !== "5") {
    console.log("\nSelect Simulation Count:");
    console.log("1. 100");
    console.log("2. 500");
    console.log("3. 1000");
    console.log("4. 5000");
    const countChoice = await question("Enter count choice (1-4): ");
    if (countChoice === "2") count = 500;
    if (countChoice === "3") count = 1000;
    if (countChoice === "4") count = 5000;
  } else {
    count = 10000;
  }

  console.log(`\nRunning Simulation...`);
  
  if (botChoice === "4") {
    await runner.runComparative(count, levels);
  } else if (botChoice === "5") {
    await runner.runBatch("Smart", count, levels);
  } else {
    const botTypes = ["Greedy", "Smart", "Human-like"];
    const t = botTypes[parseInt(botChoice) - 1] as "Greedy"|"Smart"|"Human-like";
    await runner.runBatch(t, count, levels);
  }

  console.log("Simulation complete. Generating reports...");
  runner.generateReports({ markdown: true, json: true, csv: true });
  console.log("Done! Reports generated in reports/ folder.");

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
