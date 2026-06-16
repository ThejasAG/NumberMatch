import test from "node:test";
import assert from "node:assert/strict";
import { BoardEngine, HintEngine } from "../src/index.ts";

test("hint returns null when no matches exist", () => {
  const board = new BoardEngine([
    [1, 2, 3],
    [4, 5, 6]
  ]);
  const hintEngine = new HintEngine();
  const hint = hintEngine.getHint(board);
  assert.equal(hint, null);
});

test("hint returns valid pair", () => {
  const board = new BoardEngine([
    [1, 1, 3]
  ]);
  const hintEngine = new HintEngine();
  const hint = hintEngine.getHint(board);
  assert.ok(hint);
  assert.equal(hint.pair.a.row, 0);
  assert.equal(hint.pair.a.col, 0);
  assert.equal(hint.pair.b.row, 0);
  assert.equal(hint.pair.b.col, 1);
});

test("hint obeys match rules (sum to 10)", () => {
  const board = new BoardEngine([
    [4, null, 6, 1, 2] // Added extra numbers so it's not a cleanup
  ]);
  const hintEngine = new HintEngine();
  const hint = hintEngine.getHint(board);
  assert.ok(hint);
  assert.equal(hint.reason.includes("4 + 6"), true);
});

test("hint prioritizes sparse row cleanup", () => {
  // Using 9 elements to simulate full width row correctly
  const board = new BoardEngine([
    [1, 2, 3, 4, 5, 6, 7, 8, 9], // full row, has no valid pairs? wait... 1 and something? 1 and 9 sum to 10. (valA=1, valB=9, row=0)
    [2, null, null, null, null, null, null, null, 2] // sparse row, same number match
  ]);
  const hintEngine = new HintEngine();
  const hint = hintEngine.getHint(board);
  assert.ok(hint);
  // It should pick the pair in row 1 because it cleans up the row
  assert.equal(hint.pair.a.row, 1);
  assert.equal(hint.pair.b.row, 1);
  assert.equal(hint.reason, "This move helps clear a sparse row");
});

test("hint prioritizes sparse row cleanup across rows", () => {
  const board = new BoardEngine([
    [1, 2, 3, 4, 5, 6, 7, 8, null], // almost full row
    [8, null, null, null, null, null, null, null, null] // sparse row (last remaining)
  ]);
  // The 8 in row 0 and 8 in row 1 form a pair.
  const hintEngine = new HintEngine();
  const hint = hintEngine.getHint(board);
  assert.ok(hint);
  assert.equal(hint.pair.a.row, 0);
  assert.equal(hint.pair.b.row, 1);
  assert.equal(hint.reason, "This move helps clear a sparse row");
});

test("hint is deterministic for same board", () => {
  const board1 = new BoardEngine([
    [1, 1, 5, 5]
  ]);
  const board2 = new BoardEngine([
    [1, 1, 5, 5]
  ]);
  const hintEngine = new HintEngine();
  const hint1 = hintEngine.getHint(board1);
  const hint2 = hintEngine.getHint(board2);
  assert.deepEqual(hint1, hint2);
});
