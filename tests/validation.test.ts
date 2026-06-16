import test from "node:test";
import assert from "node:assert/strict";
import { StatisticalValidationFramework } from "../src/index.ts";
import { buildCalibrationReport, calibrationMarkdown } from "../src/scripts/calibrate.ts";
import { buildSimulationReport, simulationMarkdown } from "../src/scripts/simulate.ts";
import { validationSummary } from "../src/scripts/validate.ts";

test("validation suite: board report has generated count", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateBoards([1], 5);
  assert.equal(report.levels[0].generated, 5);
});

test("validation suite: board report checks determinism", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateBoards([1], 5);
  assert.equal(report.levels[0].deterministic, 5);
});

test("validation suite: board report includes difficulty stats", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateBoards([3], 5);
  assert.equal(typeof report.levels[0].difficultyMean, "number");
  assert.equal(typeof report.levels[0].difficultyStdDev, "number");
});

test("validation suite: difficulty distribution returns mean median stddev", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateDifficultyDistribution([1, 2], 5);
  assert.equal(report.stats.length, 2);
  assert.equal(typeof report.stats[0].median, "number");
});

test("validation suite: difficulty distribution exposes comparison flags", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateDifficultyDistribution([8, 9, 10, 11], 5);
  assert.equal(typeof report.level10GreaterThan9GreaterThan8, "boolean");
  assert.equal(typeof report.level11EasierThan10, "boolean");
});

test("validation suite: add row usage report contains targets", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateAddRowUsage([1], 3);
  assert.deepEqual(report.levels[0].targetRange, [0.5, 1.5]);
});

test("validation suite: completion report contains required rate", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateCompletionRates([1], 3);
  assert.equal(report.levels[0].requiredRate, 0.95);
});

test("validation suite: sawtooth report contains means", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.validateSawtooth(3);
  assert.ok("1" in report.means);
  assert.equal(typeof report.passed, "boolean");
});

test("validation suite: final calibration report combines sections", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.generateCalibrationReport({ boardCount: 2, distributionCount: 2, simulationCount: 2 });
  assert.ok(report.boardValidation);
  assert.ok(report.difficultyDistribution);
  assert.ok(report.addRowUsage);
  assert.ok(report.completionRate);
  assert.ok(report.sawtooth);
});

test("validation suite: exporters produce json csv markdown", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.generateCalibrationReport({ boardCount: 2, distributionCount: 2, simulationCount: 2 });
  assert.ok(framework.exportJson(report).includes("boardValidation"));
  assert.ok(framework.exportCsv(report).startsWith("section,level,metric,value,passed"));
  assert.ok(framework.exportMarkdown(report).includes("# Final Calibration Report"));
});

test("production simulate script builds level table data", () => {
  const report = buildSimulationReport(2, 2);
  assert.equal(report.levels.length, 2);
  assert.equal(report.levels[0].simulations, 2);
  assert.ok(simulationMarkdown(report).includes("# Simulation Report"));
});

test("production validate script prints pass fail summary", () => {
  const framework = new StatisticalValidationFramework();
  const report = framework.generateCalibrationReport({ boardCount: 1, distributionCount: 1, simulationCount: 1 });
  const summary = validationSummary(report);
  assert.ok(summary.includes("Overall:"));
  assert.ok(summary.includes("Sawtooth curve:"));
});

test("production calibrate script emits status report", () => {
  const report = buildCalibrationReport(2);
  assert.ok(["PASS", "WARNING", "FAIL"].includes(report.status));
  assert.equal(report.levels.length, 4);
  assert.ok(calibrationMarkdown(report).includes("# Calibration Report"));
});
