import { BoardEngine } from "../../boardEngine.ts";
import { LevelGenerator } from "../../levelGenerator.ts";
import { SmartAddRowEngine } from "../../addRowEngine.ts";
import { RescueEngine } from "../../rescueEngine.ts";
import { DifficultyEngine } from "../../difficultyEngine.ts";
import type { Cell, CellValue, LevelData, MatchDebugInfo, Pair } from "../../models.ts";

export interface MatchResult {
  board: CellValue[][];
  matched: boolean;
  won: boolean;
  debug: MatchDebugInfo;
}

export class NumberMatchSession {
  private board: BoardEngine;
  private addRows = new SmartAddRowEngine();
  private rescue = new RescueEngine();
  private difficulty = new DifficultyEngine();
  private levelData: LevelData;
  private usedAddRows = 0;

  private level: number;
  private attempt: number;

  constructor(level: number, attempt: number) {
    this.level = level;
    this.attempt = attempt;
    this.levelData = new LevelGenerator().generateLevel(level, attempt);
    this.board = new BoardEngine(this.levelData.board);
  }

  getBoard(): CellValue[][] {
    return this.board.getBoardState();
  }

  getBoardEngine(): BoardEngine {
    return this.board;
  }

  getLevelData(): LevelData {
    return this.levelData;
  }

  getAddRowsUsed(): number {
    return this.usedAddRows;
  }

  getMaxAddRows(): number {
    return this.difficulty.getMaxAddRows(this.level);
  }

  getRemainingAddRows(): number {
    return Math.max(0, this.getMaxAddRows() - this.usedAddRows);
  }

  getValidPairs(): Pair[] {
    return this.board.findAllValidPairs();
  }

  canMatch(a: Cell, b: Cell): boolean {
    return this.board.isValidPair(a, b);
  }

  match(a: Cell, b: Cell): MatchResult {
    const debug = this.board.getMatchDebugInfo(a, b);
    const matched = debug.matchResult && this.board.removePair(a, b);
    if (matched) this.rescue.resetAfterSuccessfulMatch();
    return { board: this.getBoard(), matched, won: this.board.isBoardEmpty(), debug };
  }

  getMatchDebugInfo(a: Cell, b: Cell): MatchDebugInfo {
    return this.board.getMatchDebugInfo(a, b);
  }

  addRow(): { board: CellValue[][]; added: boolean; rescued: boolean; lost: boolean } {
    const maxAddRows = this.getMaxAddRows();
    if (this.usedAddRows >= maxAddRows) {
      return { board: this.getBoard(), added: false, rescued: false, lost: !this.board.isBoardEmpty() };
    }
    this.rescue.trackFailedAddRows(this.board);
    const rescued = this.rescue.shouldTriggerRescue(this.board);
    
    // For endgame rescue (remaining <= 3), the SmartAddRowEngine handles it automatically.
    // For early frustration rescue (rescued == true), we pass forceInstantMatch.
    const row = this.addRows.generateAddRow(this.board, {
        level: this.level,
        attempt: this.attempt,
        remainingAddRows: this.getRemainingAddRows(),
        forceInstantMatch: rescued
    });
    
    for (let i = 0; i < row.length; i += BoardEngine.width) {
      this.board.addRow(row.slice(i, i + BoardEngine.width));
    }
    this.usedAddRows++;
    return { board: this.getBoard(), added: true, rescued, lost: false };
  }
}
