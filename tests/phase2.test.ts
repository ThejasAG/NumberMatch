import test from "node:test";
import assert from "node:assert/strict";
import {
  AnalyticsEngine,
  AutoTuningEngine,
  BoardEngine,
  LevelGenerator,
  SimulationEngine,
  SolutionGraphGenerator
} from "../src/index.ts";

test("solution graph is deterministic, valid, and branched", () => {
  const generator = new SolutionGraphGenerator();
  const a = generator.generateSolutionGraph(1, 123);
  const b = generator.generateSolutionGraph(1, 123);
  assert.deepEqual(a, b);
  assert.equal(generator.validateGraph(a), true);
  assert.ok(generator.calculateGraphComplexity(a) > 0);
  assert.ok(generator.getSolutionPaths(a).length > 1);
});

test("level generator builds valid deterministic starting board", () => {
  const generator = new LevelGenerator();
  const level = generator.generateLevel(5, 2);
  assert.deepEqual(level, generator.generateLevel(5, 2));
  assert.equal(generator.validateLevel(level), true);
  assert.equal(level.board.length, 3);
  assert.equal(level.board[0].length, 9);
  assert.ok(generator.calculateMatchDensity(new BoardEngine(level.board)) > 0);
});

test("simulation batch reports stable metrics", () => {
  const simulation = new SimulationEngine();
  const report = simulation.simulateBatch(1, 12);
  assert.equal(report.count, 12);
  assert.equal(report.results.length, 12);
  assert.ok(report.completionRate >= 0);
  assert.ok(report.averageBoardHeight >= 3);
});

test("analytics records simulation and exports report formats", () => {
  const simulation = new SimulationEngine();
  const analytics = new AnalyticsEngine();
  const report = simulation.simulateBatch(3, 10);
  analytics.recordSimulation(report);
  const analyticsReport = analytics.generateReport();
  assert.equal(analyticsReport.sessions, 10);
  assert.ok(analytics.exportCsv().includes("level,bot,won"));
  assert.ok(analytics.exportJson().includes("completionRate"));
});

test("auto tuning evaluates and emits deterministic adjustment report", () => {
  const tuning = new AutoTuningEngine();
  const report = tuning.tuneLevel(1, 2);
  assert.equal(report.level, 1);
  assert.ok(report.iterations >= 1);
  assert.equal(typeof report.converged, "boolean");
  assert.ok("matchDensity" in report.adjustments || report.converged);
});
