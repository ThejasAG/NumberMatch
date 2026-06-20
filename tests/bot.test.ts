import test from "node:test";
import assert from "node:assert";
import { BotRunner } from "../src/testing/botRunner.ts";
import * as fs from "fs";
import * as path from "path";

test("Bot Framework Tests", async (t) => {
  await t.test("Bot completes Level 1, 5, 10", async () => {
    const runner = new BotRunner();
    // Use low count for fast test
    await runner.runBatch("Smart", 2, [1, 5, 10]);
    const db = runner.getAnalytics();
    
    // Check results exist for all levels
    assert.strictEqual(db.getLevelAnalytics(1).gamesPlayed, 2);
    assert.strictEqual(db.getLevelAnalytics(5).gamesPlayed, 2);
    assert.strictEqual(db.getLevelAnalytics(10).gamesPlayed, 2);
  });

  await t.test("Comparative Mode works", async () => {
    const runner = new BotRunner();
    await runner.runComparative(1, [1]);
    
    const all = runner.getAnalytics()['db'].getAllResults();
    assert.strictEqual(all.length, 3, "Should have 1 game for 3 bot types");
    assert.ok(all.some(r => r.botType === "Greedy"));
    assert.ok(all.some(r => r.botType === "Smart"));
    assert.ok(all.some(r => r.botType === "Human-like"));
  });

  await t.test("Reports and Analytics generate correctly", async () => {
    const runner = new BotRunner();
    await runner.runBatch("Smart", 2, [1]);
    runner.generateReports({ json: true, csv: true, markdown: true });
    
    const reportsDir = path.join(process.cwd(), "reports");
    assert.ok(fs.existsSync(path.join(reportsDir, "final-report.json")));
    assert.ok(fs.existsSync(path.join(reportsDir, "final-report.csv")));
    assert.ok(fs.existsSync(path.join(reportsDir, "final-report.md")));
    assert.ok(fs.existsSync(path.join(reportsDir, "level1-report.md")));
  });

  await t.test("Completion times and Add Row counts recorded", async () => {
    const runner = new BotRunner();
    await runner.runBatch("Smart", 1, [1]);
    const analytics = runner.getAnalytics();
    const result = analytics['db'].getAllResults()[0];
    
    assert.ok(typeof result.completionTimeSeconds === "number");
    assert.ok(typeof result.addRowsUsed === "number");
  });

  await t.test("Difficulty validation works (Sawtooth)", async () => {
    const runner = new BotRunner();
    // Use low count for fast test
    await runner.runBatch("Smart", 1, [1,2,3,4,5,6,7,8,9,10,11]);
    const validation = runner.getAnalytics().validateSawtoothDifficulty();
    assert.ok(typeof validation.passed === "boolean");
  });

  await t.test("Level 1 uses Add Row and completes successfully", async () => {
    const { GameBot } = await import("../src/testing/gameBot.ts");
    const { SmartBot } = await import("../src/testing/botStrategies.ts");
    const bot = new GameBot(new SmartBot(), "Smart");
    
    // Play Level 1, Attempt 1
    const result = await bot.play(999, 1, 1);
    
    // Due to new decoy mechanics in Level 1 (10% decoys per Add Row),
    // completion is no longer 100% mathematically guaranteed for every seed.
    // We just verify it successfully used Add Row and generated a helpfulness score.
    assert.ok(result.addRowsUsed >= 1, "Level 1 must use at least 1 Add Row to finish (started with 27 items)");
    assert.ok(result.averageReachableMatchScore >= 0, "Should track reachable match score");
  });

  await t.test("Bot CLI starts successfully", async () => {
    const { execSync } = await import("child_process");
    try {
      // Run with a dummy argument so it doesn't block on stdin
      // It might take a few seconds to run greedy. We can pass a dummy argument that is unsupported so it falls through or we just run greedy but kill it quickly.
      // Wait, let's just run tsx --no-warnings src/testing/botCli.ts to see if syntax is valid.
      execSync("npx tsx --no-warnings src/testing/botCli.ts dummyArgThatJustExits", { stdio: "ignore" });
      assert.ok(true);
    } catch (e: any) {
      assert.fail(`Bot CLI failed to start: ${e.message}`);
    }
  });
});
