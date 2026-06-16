import type { Cell } from "./models.ts";
import type { BoardEngine } from "./boardEngine.ts";
import { complementOf } from "./seeded.ts";

export class CleanupEngine {
  findSparseRows(board: BoardEngine): number[] {
    return board.getBoardState()
      .map((row, index) => ({ index, count: row.filter((v) => v !== null).length }))
      .filter((row) => row.count >= 1 && row.count <= 3)
      .map((row) => row.index);
  }

  calculateRowPriority(board: BoardEngine, rowIndex: number): number {
    const row = board.getBoardState()[rowIndex] ?? [];
    const remaining = row.filter((v) => v !== null).length;
    const rowAgeWeight = rowIndex + 1;
    const sparsityWeight = remaining === 0 ? 0 : (4 - remaining) * 10;
    const distanceWeight = Math.max(0, board.getBoardHeight() - rowIndex);
    return rowAgeWeight + sparsityWeight + distanceWeight;
  }

  generateCleanupTargets(board: BoardEngine): Cell[] {
    const sparseRows = this.findSparseRows(board);
    return sparseRows
      .sort((a, b) => this.calculateRowPriority(board, b) - this.calculateRowPriority(board, a))
      .flatMap((row) => board.getBoardState()[row].map((v, col) => v === null ? null : { row, col }).filter((v): v is Cell => v !== null));
  }

  applyCleanupBias(row: number[], board: BoardEngine): number[] {
    const targets = this.generateCleanupTargets(board);
    if (targets.length === 0) return row;
    const state = board.getBoardState();
    return row.map((value, index) => index < 3 ? complementOf(state[targets[index % targets.length].row][targets[index % targets.length].col] as number) : value);
  }
}
