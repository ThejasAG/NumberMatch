import { pathToFileURL } from "node:url";
import { buildSimulationReport, type ProductionSimulationReport } from "./simulate.ts";
import { envCount, percent, round, writeReports } from "./reportUtils.ts";

export type CalibrationStatus = "PASS" | "WARNING" | "FAIL";

export interface CalibrationLevelReport {
  level: number;
  completionRate: number;
  averageAddRows: number;
  targetCompletion: number;
  targetAddRows: [number, number];
  status: CalibrationStatus;
  notes: string[];
}

export interface CalibrationReport {
  generatedAt: string;
  simulationsPerLevel: number;
  status: CalibrationStatus;
  levels: CalibrationLevelReport[];
}

export function buildCalibrationReport(count = 10000): CalibrationReport {
  const simulation = buildSimulationReport(count, 10);
  const targetLevels = [1, 3, 5, 10];
  const levels = simulation.levels
    .filter((level) => targetLevels.includes(level.level))
    .map((level) => calibrateLevel(level.level, level.completionRate, level.averageAddRows));
  return {
    generatedAt: simulation.generatedAt,
    simulationsPerLevel: simulation.simulationsPerLevel,
    status: combineStatus(levels.map((level) => level.status)),
    levels
  };
}

export function calibrationMarkdown(report: CalibrationReport): string {
  const lines = ["# Calibration Report", "", `Status: ${report.status}`, "", "| Level | Completion | Avg Add Rows | Target Rows | Status | Notes |", "|---:|---:|---:|---:|---|---|"];
  for (const row of report.levels) {
    lines.push(`| ${row.level} | ${percent(row.completionRate)} | ${round(row.averageAddRows)} | ${row.targetAddRows[0]}-${row.targetAddRows[1]} | ${row.status} | ${row.notes.join("; ")} |`);
  }
  return lines.join("\n");
}

export function printCalibrationReport(report: CalibrationReport): void {
  console.log(`Calibration Status: ${report.status}`);
  console.table(report.levels.map((row) => ({
    level: row.level,
    completion: percent(row.completionRate),
    avgAddRows: round(row.averageAddRows),
    targetRows: `${row.targetAddRows[0]}-${row.targetAddRows[1]}`,
    status: row.status
  })));
}

async function main(): Promise<void> {
  const count = envCount("CALIBRATION_SIMULATION_COUNT", 10000);
  const report = buildCalibrationReport(count);
  printCalibrationReport(report);
  await writeReports("calibration-report", report, calibrationMarkdown(report));
}

function calibrateLevel(level: number, completionRate: number, averageAddRows: number): CalibrationLevelReport {
  const targetCompletion = 0.95;
  const targetAddRows = targetAddRowsFor(level);
  const completionPass = completionRate >= targetCompletion;
  const addRowsPass = averageAddRows >= targetAddRows[0] && averageAddRows <= targetAddRows[1];
  const notes: string[] = [];
  if (!completionPass) notes.push("completion below target");
  if (!addRowsPass) notes.push("add row usage outside target");
  const nearRows = averageAddRows >= targetAddRows[0] - 0.5 && averageAddRows <= targetAddRows[1] + 0.5;
  const status: CalibrationStatus = completionPass && addRowsPass ? "PASS" : completionRate >= 0.9 && nearRows ? "WARNING" : "FAIL";
  return { level, completionRate, averageAddRows, targetCompletion, targetAddRows, status, notes };
}

function targetAddRowsFor(level: number): [number, number] {
  if (level === 1) return [0.5, 1.5];
  if (level === 10) return [4, 6];
  return [2, 3];
}

function combineStatus(statuses: CalibrationStatus[]): CalibrationStatus {
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("WARNING")) return "WARNING";
  return "PASS";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
