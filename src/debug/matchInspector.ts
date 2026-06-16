import type { Cell, PathType } from "../models.ts";
import { BoardEngine } from "../boardEngine.ts";

export interface InspectionResult {
  cellA: Cell;
  cellB: Cell;
  valueA: number | null;
  valueB: number | null;
  valuesMatch: boolean;
  sameNumber: boolean;
  sumToTen: boolean;
  pathType: PathType;
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
  wrap: boolean;
  distance: number;
  intermediateCells: Cell[];
  blockers: Cell[];
  pathClear: boolean;
  finalResult: boolean;
  failureReasons: string[];
  successReasons: string[];
  evaluationTree: string[];
  timestamp: number;
}

export function inspectMatch(board: BoardEngine, cellA: Cell, cellB: Cell): InspectionResult {
  const valueA = board.valueAt(cellA);
  const valueB = board.valueAt(cellB);
  
  const sameNumber = valueA !== null && valueB !== null && valueA === valueB;
  const sumToTen = valueA !== null && valueB !== null && valueA + valueB === 10;
  const valuesMatch = sameNumber || sumToTen;
  
  const pathInfo = board.inspectPath(cellA, cellB);
  
  const failureReasons: string[] = [];
  const successReasons: string[] = [];
  const evaluationTree: string[] = [];
  
  evaluationTree.push(`Evaluating match between row=${cellA.row} col=${cellA.col} and row=${cellB.row} col=${cellB.col}`);
  evaluationTree.push(`Values: A=${valueA}, B=${valueB}`);
  
  if (valueA === null || valueB === null) {
      failureReasons.push("One or both cells are empty");
      evaluationTree.push(`❌ Failed: Empty cells`);
  } else if (!valuesMatch) {
      failureReasons.push("Values neither match nor sum to 10");
      evaluationTree.push(`❌ Failed: Values do not match or sum to 10`);
  } else {
      if (sameNumber) successReasons.push("Values are the same number");
      if (sumToTen) successReasons.push("Values sum to 10");
      evaluationTree.push(`✅ Passed: Values match`);
  }
  
  evaluationTree.push(`Pathing: Type=${pathInfo.pathType}`);
  
  if (pathInfo.pathType === "none") {
      failureReasons.push("Cells are not connected by horizontal, vertical, diagonal, or wrap path");
      evaluationTree.push(`❌ Failed: No valid path type found`);
  } else {
      if (pathInfo.blockers.length > 0) {
          failureReasons.push(`Path blocked by ${pathInfo.blockers.length} cells`);
          const firstBlocker = pathInfo.blockers[0];
          const blockerVal = board.valueAt(firstBlocker);
          failureReasons.push(`Blocked at row=${firstBlocker.row} col=${firstBlocker.col} value=${blockerVal}`);
          evaluationTree.push(`❌ Failed: Path blocked by ${pathInfo.blockers.length} cells`);
      } else {
          successReasons.push(`Connected by ${pathInfo.pathType} path`);
          successReasons.push("No blockers detected");
          evaluationTree.push(`✅ Passed: Path is clear`);
      }
  }
  
  const finalResult = valuesMatch && pathInfo.result;
  
  if (finalResult) {
      successReasons.push("Match valid");
      evaluationTree.push(`🌟 Final Result: SUCCESS`);
  } else {
      evaluationTree.push(`⛔ Final Result: FAILURE`);
  }

  const result: InspectionResult = {
    cellA,
    cellB,
    valueA,
    valueB,
    valuesMatch,
    sameNumber,
    sumToTen,
    pathType: pathInfo.pathType,
    horizontal: pathInfo.pathType === "horizontal",
    vertical: pathInfo.pathType === "vertical",
    diagonal: pathInfo.pathType === "diagonal",
    wrap: pathInfo.pathType === "wrap",
    distance: pathInfo.distance,
    intermediateCells: pathInfo.intermediateCells,
    blockers: pathInfo.blockers,
    pathClear: pathInfo.result,
    finalResult,
    failureReasons,
    successReasons,
    evaluationTree,
    timestamp: Date.now()
  };

  console.group("Match Inspector");
  console.log("Cell A", cellA);
  console.log("Cell B", cellB);
  console.log("Value A", valueA);
  console.log("Value B", valueB);
  console.log("Path Type", pathInfo.pathType);
  console.log("Distance", pathInfo.distance);
  console.log("Intermediate Cells", pathInfo.intermediateCells);
  console.log("Blockers", pathInfo.blockers);
  console.log("Values Match", valuesMatch);
  console.log("Path Clear", pathInfo.result);
  console.log("Final Result", finalResult);
  console.log("Failure Reasons", failureReasons);
  console.log("Evaluation Tree", evaluationTree);
  console.groupEnd();

  return result;
}

export function explainMatch(result: InspectionResult): string {
  let explanation = result.finalResult ? "VALID\n\n" : "INVALID\n\n";
  explanation += `${result.valueA} and ${result.valueB}\n\n`;
  explanation += `Path: ${result.pathType === "none" ? "None" : result.pathType.charAt(0).toUpperCase() + result.pathType.slice(1)}\n\n`;
  
  if (result.pathType !== "none") {
      explanation += `Distance: ${result.distance}\n\n`;
      explanation += `Blockers: ${result.blockers.length === 0 ? "None" : result.blockers.length}\n\n`;
  }
  
  explanation += `Reason:\n\n`;
  
  if (result.finalResult) {
      if (result.sameNumber) {
          explanation += `Same number and ${result.pathType} path is clear.`;
      } else if (result.sumToTen) {
          explanation += `Values sum to 10 and ${result.pathType} path is clear.`;
      }
  } else {
      if (result.failureReasons.length > 0) {
          explanation += result.failureReasons.join("\n");
      } else {
          explanation += "Match failed for unknown reason.";
      }
  }
  
  return explanation;
}
