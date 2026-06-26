import test from "node:test";
import assert from "node:assert/strict";
import { BoardEngine, DifficultyEngine, RescueEngine, SmartAddRowEngine } from "../src/index.ts";

test("board generation is deterministic by level and attempt", () => {
  const a = new BoardEngine().generateBoard(5, 2);
  const b = new BoardEngine().generateBoard(5, 2);
  const c = new BoardEngine().generateBoard(5, 3);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("board engine detects horizontal, vertical, diagonal, and wrap matches", () => {
  const board = new BoardEngine([
    [5, 5, null, null, null, null, null, null, 3],
    [7, 2, null, null, null, null, null, null, null],
    [null, null, 8, null, null, null, null, null, null]
  ]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 0, col: 1 }), true);
  assert.equal(board.isValidPair({ row: 0, col: 8 }, { row: 1, col: 0 }), true);
  assert.equal(board.isValidPair({ row: 1, col: 1 }, { row: 2, col: 2 }), true);
});

test("classic matching allows horizontal gap through empty cells", () => {
  const board = new BoardEngine([[2, null, null, null, 2]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 0, col: 4 }), true);
});

test("classic matching allows sum-to-ten horizontal gap", () => {
  const board = new BoardEngine([[4, null, null, null, 6]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 0, col: 4 }), true);
});

test("classic matching allows 3 and 7 horizontal gap", () => {
  const board = new BoardEngine([[3, null, null, null, 7]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 0, col: 4 }), true);
});

test("classic matching allows vertical gap through empty cells", () => {
  const board = new BoardEngine([[2], [null], [null], [2]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 0 }), true);
});

test("classic matching allows diagonal gap through empty cells", () => {
  const board = new BoardEngine([
    [2, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 2]
  ]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 3 }), true);
});

test("long diagonal same number is valid", () => {
  const board = new BoardEngine([
    [9, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 9]
  ]);
  assert.equal(board.isDiagonalPathClear({ row: 0, col: 0 }, { row: 3, col: 3 }), true);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 3 }), true);
});

test("long diagonal sum-to-ten is valid", () => {
  const board = new BoardEngine([
    [4, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 6]
  ]);
  assert.equal(board.isDiagonalPathClear({ row: 0, col: 0 }, { row: 3, col: 3 }), true);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 3 }), true);
});

test("blocked diagonal is invalid", () => {
  const board = new BoardEngine([
    [9, null, null, null],
    [null, 5, null, null],
    [null, null, null, null],
    [null, null, null, 9]
  ]);
  assert.equal(board.isDiagonalPathClear({ row: 0, col: 0 }, { row: 3, col: 3 }), false);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 3 }), false);
});

test("adjacent diagonal is valid", () => {
  const board = new BoardEngine([
    [8, null],
    [null, 8]
  ]);
  assert.equal(board.isDiagonalPathClear({ row: 0, col: 0 }, { row: 1, col: 1 }), true);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 1, col: 1 }), true);
});

test("reverse diagonal is valid", () => {
  const board = new BoardEngine([
    [null, null, null, 7],
    [null, null, null, null],
    [null, null, null, null],
    [7, null, null, null]
  ]);
  assert.equal(board.isDiagonalPathClear({ row: 0, col: 3 }, { row: 3, col: 0 }), true);
  assert.equal(board.isValidPair({ row: 0, col: 3 }, { row: 3, col: 0 }), true);
});

test("classic matching allows wrap path through empty cells", () => {
  const board = new BoardEngine([
    [null, null, null, null, null, null, null, null, 3],
    [null, null, null, null, 7, null, null, null, null]
  ]);
  assert.equal(board.isValidPair({ row: 0, col: 8 }, { row: 1, col: 4 }), true);
});

test("classic matching blocks horizontal path with number between", () => {
  const board = new BoardEngine([[2, 5, null, 2]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 0, col: 3 }), false);
});

test("classic matching blocks vertical path with number between", () => {
  const board = new BoardEngine([[2], [5], [null], [2]]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 0 }), false);
});

test("classic matching blocks diagonal path with number between", () => {
  const board = new BoardEngine([
    [2, null, null, null],
    [null, 5, null, null],
    [null, null, null, null],
    [null, null, null, 2]
  ]);
  assert.equal(board.isValidPair({ row: 0, col: 0 }, { row: 3, col: 3 }), false);
});

test("classic matching blocks wrap path with number between", () => {
  const board = new BoardEngine([
    [null, null, null, null, null, null, null, null, 3],
    [null, 5, null, null, 7, null, null, null, null]
  ]);
  assert.equal(board.isValidPair({ row: 0, col: 8 }, { row: 1, col: 4 }), false);
});

test("match debug reports path type blockers and result", () => {
  const board = new BoardEngine([[2, 5, null, 2]]);
  const debug = board.getMatchDebugInfo({ row: 0, col: 0 }, { row: 0, col: 3 });
  assert.equal(debug.pathType, "horizontal");
  assert.deepEqual(debug.blockers, [{ row: 0, col: 1 }]);
  assert.equal(debug.matchResult, false);
});

test("remove pair clears cells and empty board wins", () => {
  const board = new BoardEngine([[4, 6]]);
  assert.equal(board.removePair({ row: 0, col: 0 }, { row: 0, col: 1 }), true);
  assert.equal(board.isBoardEmpty(), true);
});

test("smart add row is deterministic and always creates future match", () => {
  const board = new BoardEngine();
  board.generateBoard(10, 1);
  const engine = new SmartAddRowEngine();
  const row = engine.generateAddRow(board, { level: 10, attempt: 1, remainingAddRows: 6 });
  assert.equal(row.length, board.getRemainingNumbers().length);
  const withRow = new BoardEngine(board.getBoardState());
  for (let i = 0; i < row.length; i += BoardEngine.width) {
    withRow.addRow(row.slice(i, i + BoardEngine.width));
  }
  assert.ok(withRow.findAllValidPairs().length > board.findAllValidPairs().length);
});

test("rescue triggers after two failed add rows and produces visible match", () => {
  const board = new BoardEngine([[1, null, 2, null, 3]]);
  const rescue = new RescueEngine();
  rescue.trackFailedAddRows(board);
  rescue.trackFailedAddRows(board);
  assert.equal(rescue.shouldTriggerRescue(board), true);
  assert.equal(rescue.validateRescueSuccess(rescue.generateRescueRow(1, 1)), true);
});

test("difficulty profiles follow sawtooth curve", () => {
  const difficulty = new DifficultyEngine();
  assert.equal(difficulty.getDifficultyProfile(1).name, "Easy");
  assert.equal(difficulty.getDifficultyProfile(6).name, "Easy+");
  assert.equal(difficulty.getDifficultyProfile(10).name, "Peak");
  assert.deepEqual(difficulty.getTargetAddRows(10), [4, 6]);
});

test("getMaxAddRows returns dynamic row budgets by level", () => {
  const difficulty = new DifficultyEngine();
  assert.equal(difficulty.getMaxAddRows(1), 6);
  assert.equal(difficulty.getMaxAddRows(3), 6);
  assert.equal(difficulty.getMaxAddRows(10), 6);
});

test("generateAddRow applies seesaw logic based on remaining numbers", () => {
  const board = new BoardEngine([
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [3, 7, 6, null, null, null, null, null, null]
  ]);
  const addRowEngine = new SmartAddRowEngine();
  const row = addRowEngine.generateAddRow(board, { level: 2, attempt: 1, remainingAddRows: 3 });
  assert.deepEqual(row, [6, 3, 3]);
});
