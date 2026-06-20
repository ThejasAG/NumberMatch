import { BoardEngine } from "../boardEngine.ts";
import { SmartAddRowEngine } from "../addRowEngine.ts";

function generateSampleRows() {
  const engine = new SmartAddRowEngine();
  const levels = [1, 5, 10];
  
  for (const level of levels) {
    console.log(`\n================================`);
    console.log(`LEVEL ${level} ADD ROW SAMPLES`);
    console.log(`================================`);
    
    // We create a mock board with a few stranded numbers
    // e.g. 3, 7, 5
    const board = new BoardEngine([
      [3, 7, 5, null, null, null, null, null, null],
      Array(9).fill(null),
      Array(9).fill(null)
    ]);
    
    for (let i = 1; i <= 10; i++) {
      const row = engine.generateAddRow(board, { level, attempt: i, remainingAddRows: 6 });
      
      const helpfulness = engine.calculateHelpfulness(row, board);
      const solvability = engine.calculateFutureSolvability(row, board);
      const diversity = engine.calculateDiversity(row);
      const pairDiversity = engine.calculatePairDiversity(row);
      
      console.log(`Sample ${i}: [${row.join(", ")}]`);
      console.log(`  Helpfulness: ${helpfulness.toFixed(1)}%`);
      console.log(`  Solvability: ${solvability.toFixed(1)}%`);
      console.log(`  Diversity:   ${diversity.toFixed(1)}%`);
      console.log(`  Pair Divers: ${pairDiversity}`);
      
      let pass = false;
      if (level <= 2) pass = helpfulness >= 80 && solvability >= 90 && diversity >= 60 && diversity <= 70;
      else if (level <= 4) pass = helpfulness >= 70 && solvability >= 80 && diversity >= 55 && diversity <= 65;
      else if (level <= 9) pass = helpfulness >= 50 && solvability >= 70 && diversity >= 45 && diversity <= 60;
      else pass = helpfulness >= 20 && solvability >= 50 && diversity >= 30 && diversity <= 50;
      
      console.log(`  Result:      ${pass ? "PASS" : "FAIL"}\n`);
    }
  }
}

generateSampleRows();
