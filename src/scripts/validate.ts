import { pathToFileURL } from "node:url";
import { StatisticalValidationFramework } from "../index.ts";
import type { FinalCalibrationReport } from "../models.ts";
import { envCount, writeReports } from "./reportUtils.ts";

export function buildValidationReport(): FinalCalibrationReport {
  const framework = new StatisticalValidationFramework();
  return framework.generateCalibrationReport({
    boardCount: envCount("BOARD_VALIDATION_COUNT", 10000),
    distributionCount: envCount("DISTRIBUTION_VALIDATION_COUNT", 1000),
    simulationCount: envCount("VALIDATION_SIMULATION_COUNT", 10000)
  });
}

export function validationSummary(report: FinalCalibrationReport): string {
  return [
    `Overall: ${report.passed ? "PASS" : "FAIL"}`,
    `Board solvability/determinism: ${report.boardValidation.passed ? "PASS" : "FAIL"}`,
    `Difficulty targets: ${report.difficultyDistribution.passed ? "PASS" : "FAIL"}`,
    `Add row targets: ${report.addRowUsage.passed ? "PASS" : "FAIL"}`,
    `Completion targets: ${report.completionRate.passed ? "PASS" : "FAIL"}`,
    `Sawtooth curve: ${report.sawtooth.passed ? "PASS" : "FAIL"}`
  ].join("\n");
}

async function main(): Promise<void> {
  const framework = new StatisticalValidationFramework();
  const report = buildValidationReport();
  console.log(validationSummary(report));
  await writeReports("validation-report", report, framework.exportMarkdown(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
