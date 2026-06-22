import { BoardEngine } from "./src/boardEngine.ts";
import { SmartAddRowEngine } from "./src/addRowEngine.ts";

const board = new BoardEngine([
  [1, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, 1],
  [9, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, 9]
]);

const engine = new SmartAddRowEngine();
const row = engine.generateAddRow(board, { level: 1, attempt: 1, remainingAddRows: 6 });
console.log("Remaining numbers on board:", board.getRemainingNumbers());
console.log("Generated Add Row:", row);

board.addRow(row);
console.log("Pairs after add row:", board.findAllValidPairs().length);
