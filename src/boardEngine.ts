import type { Cell, CellValue, MatchDebugInfo, Pair, PathType } from "./models.ts";
import { deterministicSeed, isMatchingValue, SeededSequence } from "./seeded.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";

export type PathCheck = {
  pathType: PathType;
  distance: number;
  intermediateCells: Cell[];
  blockers: Cell[];
  result: boolean;
};

export class BoardEngine {
  static readonly width = 9;
  private board: CellValue[][];
  private historyBoard: number[][];

  constructor(board: CellValue[][] = []) {
    this.board = board.map((row) => row.slice());
    this.historyBoard = board.map((row) => row.map(v => v ?? 0));
  }

  generateBoard(level = 1, attempt = 1): CellValue[][] {
    const rng = new SeededSequence(deterministicSeed(level, attempt));
    const profile = new DifficultyEngine().getDifficultyProfile(level);
    const cells = 27;
    const values: number[] = [];

    while (values.length < cells - 1) {
      const a = rng.int(1, 9);
      const useSame = rng.next() < profile.matchDensity;
      const b = useSame ? a : 10 - a;
      values.push(a, b);
    }
    if (values.length < cells) values.push(rng.int(1, 9));

    this.board = [];
    this.historyBoard = [];
    for (let i = 0; i < cells; i += BoardEngine.width) {
      this.board.push(values.slice(i, i + BoardEngine.width));
      this.historyBoard.push(values.slice(i, i + BoardEngine.width));
    }
    return this.getBoardState();
  }

  findAllValidPairs(): Pair[] {
    const pairs: Pair[] = [];
    for (let row = 0; row < this.board.length; row++) {
      for (let col = 0; col < BoardEngine.width; col++) {
        const a = { row, col };
        if (this.valueAt(a) === null) continue;
        for (const b of this.allLaterCells(a)) {
          if (this.compareCells(a, b) < 0 && this.isValidPair(a, b)) pairs.push({ a, b });
        }
      }
    }
    return pairs;
  }

  isValidPair(cellA: Cell, cellB: Cell): boolean {
    const a = this.valueAt(cellA);
    const b = this.valueAt(cellB);
    return a !== null && b !== null && isMatchingValue(a, b) && this.isPathClear(cellA, cellB);
  }

  isPathClear(cellA: Cell, cellB: Cell): boolean {
    return this.inspectPath(cellA, cellB).result;
  }

  isHorizontalPathClear(cellA: Cell, cellB: Cell): boolean {
    const path = this.inspectPath(cellA, cellB);
    return path.pathType === "horizontal" && path.result;
  }

  isVerticalPathClear(cellA: Cell, cellB: Cell): boolean {
    const path = this.inspectPath(cellA, cellB);
    return path.pathType === "vertical" && path.result;
  }

  isDiagonalPathClear(cellA: Cell, cellB: Cell): boolean {
    const path = this.inspectPath(cellA, cellB);
    return path.pathType === "diagonal" && path.result;
  }

  isWrapPathClear(cellA: Cell, cellB: Cell): boolean {
    const path = this.inspectPath(cellA, cellB);
    return path.pathType === "wrap" && path.result;
  }

  getMatchDebugInfo(cellA: Cell, cellB: Cell): MatchDebugInfo {
    const a = this.valueAt(cellA);
    const b = this.valueAt(cellB);
    const path = this.inspectPath(cellA, cellB);
    const valuesMatch = a !== null && b !== null && isMatchingValue(a, b);
    const pathClear = path.result;
    console.debug("Number Match path check", {
      "Path Type": path.pathType,
      Distance: path.distance,
      "Intermediate Cells": path.intermediateCells,
      Blockers: path.blockers,
      Result: path.result
    });
    return {
      cellA,
      cellB,
      pathType: path.pathType,
      blockers: path.blockers,
      valuesMatch,
      pathClear,
      matchResult: valuesMatch && pathClear
    };
  }

  removePair(cellA: Cell, cellB: Cell): boolean {
    if (!this.isValidPair(cellA, cellB)) return false;
    this.board[cellA.row][cellA.col] = null;
    this.board[cellB.row][cellB.col] = null;
    this.trimEmptyBottomRows();
    return true;
  }

  addRow(numbers: number[]): void {
    if (numbers.length === 0) return;
    let currentNumbers = [...numbers];

    // If the last row is not full, fill it first
    if (this.board.length > 0) {
      const lastRow = this.board[this.board.length - 1];
      if (lastRow.length < BoardEngine.width) {
        const spaceLeft = BoardEngine.width - lastRow.length;
        const toAdd = currentNumbers.slice(0, spaceLeft);
        lastRow.push(...toAdd);
        this.historyBoard[this.historyBoard.length - 1].push(...toAdd);
        currentNumbers = currentNumbers.slice(spaceLeft);
      }
    }

    // Add remaining numbers as new rows
    for (let i = 0; i < currentNumbers.length; i += BoardEngine.width) {
      const chunk = currentNumbers.slice(i, i + BoardEngine.width);
      this.board.push(chunk.slice());
      this.historyBoard.push(chunk.slice());
    }
  }

  getRemainingNumbers(): number[] {
    return this.board.flat().filter((value): value is number => value !== null);
  }

  isBoardEmpty(): boolean {
    return this.getRemainingNumbers().length === 0;
  }

  getBoardState(): CellValue[][] {
    return this.board.map((row) => row.slice());
  }

  getBoardHeight(): number {
    return this.board.length;
  }

  valueAt(cell: Cell): CellValue {
    return this.board[cell.row]?.[cell.col] ?? null;
  }

  getOriginalValue(cell: Cell): number {
    return this.historyBoard[cell.row]?.[cell.col] ?? 0;
  }

  private allLaterCells(cell: Cell): Cell[] {
    const out: Cell[] = [];
    for (let row = cell.row; row < this.board.length; row++) {
      const startCol = row === cell.row ? cell.col + 1 : 0;
      for (let col = startCol; col < BoardEngine.width; col++) {
        if (this.valueAt({ row, col }) !== null) out.push({ row, col });
      }
    }
    return out;
  }

  private getBlockers(a: Cell, b: Cell): Cell[] {
    return this.getPathCells(a, b).between.filter((cell) => this.valueAt(cell) !== null);
  }

  public inspectPath(a: Cell, b: Cell): PathCheck {
    const path = this.getPathCells(a, b);
    const distance = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
    const blockers = path.between.filter((cell) => this.valueAt(cell) !== null);
    return {
      pathType: path.pathType,
      distance,
      intermediateCells: path.between,
      blockers,
      result: path.pathType !== "none" && blockers.length === 0
    };
  }

  private getPathCells(a: Cell, b: Cell): { pathType: PathType; between: Cell[] } {
    if (a.row === b.row && a.col === b.col) return { pathType: "none", between: [] };
    if (a.row === b.row) return { pathType: "horizontal", between: this.betweenLine(a, b, 0, Math.sign(b.col - a.col)) };
    if (a.col === b.col) return { pathType: "vertical", between: this.betweenLine(a, b, Math.sign(b.row - a.row), 0) };
    if (Math.abs(a.row - b.row) === Math.abs(a.col - b.col)) {
      return { pathType: "diagonal", between: this.betweenLine(a, b, Math.sign(b.row - a.row), Math.sign(b.col - a.col)) };
    }
    const wrap = this.wrapBetween(a, b);
    return wrap ? { pathType: "wrap", between: wrap } : { pathType: "none", between: [] };
  }

  private betweenLine(a: Cell, b: Cell, rowStep: number, colStep: number): Cell[] {
    const cells: Cell[] = [];
    let row = a.row + rowStep;
    let col = a.col + colStep;
    while (row !== b.row || col !== b.col) {
      cells.push({ row, col });
      row += rowStep;
      col += colStep;
    }
    return cells;
  }

  private wrapBetween(a: Cell, b: Cell): Cell[] | null {
    const [start, end] = this.compareCells(a, b) <= 0 ? [a, b] : [b, a];
    if (end.row <= start.row) return null;
    const cells: Cell[] = [];
    for (let col = start.col + 1; col < BoardEngine.width; col++) cells.push({ row: start.row, col });
    for (let row = start.row + 1; row < end.row; row++) {
      for (let col = 0; col < BoardEngine.width; col++) cells.push({ row, col });
    }
    for (let col = 0; col < end.col; col++) cells.push({ row: end.row, col });
    return cells;
  }

  private compareCells(a: Cell, b: Cell): number {
    return a.row === b.row ? a.col - b.col : a.row - b.row;
  }

  private trimEmptyBottomRows(): void {
    while (this.board.length && this.board[this.board.length - 1].every((v) => v === null)) {
      this.board.pop();
      this.historyBoard.pop();
    }
  }
}
