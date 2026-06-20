import { AutoTrainer } from "./autoTrainer.ts";

async function main() {
  const levelToTrain = parseInt(process.argv[2] || "5");
  const trainer = new AutoTrainer();
  await trainer.train(levelToTrain);
}

main().catch(console.error);
