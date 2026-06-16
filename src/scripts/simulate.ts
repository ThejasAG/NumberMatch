import { pathToFileURL } from "node:url";
import { LevelGenerator, SimulationEngine } from "../index.ts";
import type { SimulationReport } from "../models.ts";
import { envCount, percent, round, writeReports } from "./reportUtils.ts";

export interface ProductionSimulationLevel {
  level: number;
  simulations: number;
  completionRate: number;
  averageMoves: number;
  averageAddRows: number;
  averageDifficultyScore: number;
  rescueActivationRate: number;
}

export interface ProductionSimulationReport {
  generatedAt: string;
  simulationsPerLevel: number;
  levels: ProductionSimulationLevel[];
}

export function buildSimulationReport(count = 10000, maxLevel = 10): ProductionSimulationReport {
  const simulation = new SimulationEngine();
  const levels = new LevelGenerator();
  const rows: ProductionSimulationLevel[] = [];

  for (let level = 1; level <= maxLevel; level++) {
    const report = simulation.simulateBatch(level, count);
    rows.push(toProductionLevel(report, averageDifficulty(levels, level, count)));
  }

  return { generatedAt: new Date().toISOString(), simulationsPerLevel: count, levels: rows };
}

export function simulationMarkdown(report: ProductionSimulationReport): string {
  const lines = ["# Simulation Report", "", `Simulations per level: ${report.simulationsPerLevel}`, "", "| Level | Completion | Avg Moves | Avg Add Rows | Avg Difficulty | Rescue % |", "|---:|---:|---:|---:|---:|---:|"];
  for (const row of report.levels) {
    lines.push(`| ${row.level} | ${percent(row.completionRate)} | ${round(row.averageMoves)} | ${round(row.averageAddRows)} | ${round(row.averageDifficultyScore)} | ${percent(row.rescueActivationRate)} |`);
  }
  return lines.join("\n");
}

export function printSimulationTable(report: ProductionSimulationReport): void {
  console.table(report.levels.map((row) => ({
    level: row.level,
    completion: percent(row.completionRate),
    avgMoves: round(row.averageMoves),
    avgAddRows: round(row.averageAddRows),
    avgDifficulty: round(row.averageDifficultyScore),
    rescue: percent(row.rescueActivationRate)
  })));
}

async function main(): Promise<void> {
  const count = envCount("SIMULATION_COUNT", 10000);
  const report = buildSimulationReport(count);
  printSimulationTable(report);
  await writeReports("simulation-report", report, simulationMarkdown(report));
}

function toProductionLevel(report: SimulationReport, averageDifficultyScore: number): ProductionSimulationLevel {
  const averageMoves = report.results.reduce((sum, result) => sum + result.moves, 0) / Math.max(1, report.results.length);
  const rescueActivationRate = report.results.filter((result) => result.rescueActivations > 0).length / Math.max(1, report.results.length);
  return {
    level: report.level,
    simulations: report.count,
    completionRate: report.completionRate,
    averageMoves,
    averageAddRows: report.averageAddRowsUsed,
    averageDifficultyScore,
    rescueActivationRate
  };
}

function averageDifficulty(levels: LevelGenerator, level: number, count: number): number {
  let total = 0;
  for (let attempt = 1; attempt <= count; attempt++) total += levels.generateLevel(level, attempt).difficultyScore;
  return total / Math.max(1, count);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
