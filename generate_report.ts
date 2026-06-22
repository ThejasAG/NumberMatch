import { StatisticalValidationFramework } from "./src/validationFramework.ts";
import * as fs from "fs";

async function main() {
    console.log("Generating validation report (1000 simulations per level). This may take a minute...");
    const framework = new StatisticalValidationFramework();
    // Use 1000 simulations for level metrics as requested
    const report = framework.generateCalibrationReport({
        boardCount: 1000,
        distributionCount: 100,
        simulationCount: 1000
    });
    const markdown = framework.exportMarkdown(report);
    fs.writeFileSync("d:/numberMatch/validation_report.md", markdown);
    console.log("Report generated at d:/numberMatch/validation_report.md");
}

main().catch(console.error);
