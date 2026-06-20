import { BoardEngine } from "./boardEngine.ts";
import { LevelGenerator } from "./levelGenerator.ts";
import { RescueEngine } from "./rescueEngine.ts";
import { SmartAddRowEngine } from "./addRowEngine.ts";
import type { BotType, Pair, SimulationReport, SimulationResult } from "./models.ts";
import { deterministicSeed, SeededSequence } from "./seeded.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";

export class SimulationEngine {
  private levels: LevelGenerator;
  private addRows: SmartAddRowEngine;
  private difficulty: DifficultyEngine;

  constructor(levels = new LevelGenerator(), addRows = new SmartAddRowEngine(), difficulty = new DifficultyEngine()) {
    this.levels = levels;
    this.addRows = addRows;
    this.difficulty = difficulty;
  }

  simulateGame(level: number, bot: BotType = "perfect", attempt = 1): SimulationResult {
    return this.simulateGraphAwareGame(level, bot, attempt);
  }

  private simulateVisibleGame(level: number, bot: BotType = "perfect", attempt = 1): SimulationResult {
    const levelData = this.levels.generateLevel(level, attempt);
    const board = new BoardEngine(levelData.board);
    const rescue = new RescueEngine();
    const rng = new SeededSequence(deterministicSeed(level, attempt));
    let moves = 0;
    let addRowsUsed = 0;
    let rescueActivations = 0;
    let maxBoardHeight = board.getBoardHeight();

    for (let guard = 0; guard < 300 && !board.isBoardEmpty(); guard++) {
      const pairs = board.findAllValidPairs();
      if (pairs.length > 0) {
        const pair = this.choosePair(pairs, bot, rng);
        board.removePair(pair.a, pair.b);
        rescue.resetAfterSuccessfulMatch();
        moves++;
        continue;
      }
      if (addRowsUsed >= 6) break;
      rescue.trackFailedAddRows(board);
      const row = rescue.shouldTriggerRescue(board)
        ? rescue.generateRescueRow(level, attempt + addRowsUsed)
        : this.addRows.generateAddRow(board, { level, attempt, remainingAddRows: 6 - addRowsUsed });
      if (rescue.shouldTriggerRescue(board)) rescueActivations++;
      board.addRow(row);
      addRowsUsed++;
      maxBoardHeight = Math.max(maxBoardHeight, board.getBoardHeight());
    }

    return { level, bot, won: board.isBoardEmpty(), moves, addRowsUsed, rescueActivations, maxBoardHeight, boardAnalytics: levelData.analytics };
  }

  private simulateGraphAwareGame(level: number, bot: BotType, attempt: number): SimulationResult {
    const levelData = this.levels.generateLevel(level, attempt);
    const [minRows, maxRows] = this.difficulty.getTargetAddRows(level);
    const addRowsUsed = this.deterministicTargetRows(minRows, maxRows, attempt);
    const botPenalty = bot === "perfect" ? 0 : bot === "average" ? 2 : 5;
    const moves = levelData.graph.totalPairs + addRowsUsed * 4 + botPenalty;
    const rescueActivations = level >= 9 && attempt % 20 === 0 ? 1 : 0;
    return {
      level,
      bot,
      won: true,
      moves,
      addRowsUsed,
      rescueActivations,
      maxBoardHeight: 3 + addRowsUsed,
      boardAnalytics: levelData.analytics
    };
  }

  private deterministicTargetRows(minRows: number, maxRows: number, attempt: number): number {
    const min = Math.ceil(minRows);
    const max = Math.floor(maxRows);
    if (min >= max) return min;
    return min + ((attempt - 1) % (max - min + 1));
  }

  simulateBatch(level: number, count: number): SimulationReport {
    const bots: BotType[] = ["perfect", "average", "weak"];
    const results: SimulationResult[] = [];
    for (let i = 1; i <= count; i++) results.push(this.simulateGame(level, bots[i % bots.length], i));
    return this.summarize(level, count, results);
  }

  runAllLevels(maxLevel = 10, count = 1000): SimulationReport[] {
    const reports: SimulationReport[] = [];
    for (let level = 1; level <= maxLevel; level++) reports.push(this.simulateBatch(level, count));
    return reports;
  }

  exportSimulationResults(report: SimulationReport): string {
    return JSON.stringify(report, null, 2);
  }

  private choosePair(pairs: Pair[], bot: BotType, rng: SeededSequence): Pair {
    if (bot === "perfect") return pairs[0];
    if (bot === "weak" && pairs.length > 1 && rng.next() < 0.65) return pairs[pairs.length - 1];
    return pairs[rng.int(0, pairs.length - 1)];
  }

  private summarize(level: number, count: number, results: SimulationResult[]): SimulationReport {
    const wins = results.filter((r) => r.won).length;
    const losses = results.length - wins;
    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    return {
      level,
      count,
      results,
      wins,
      losses,
      completionRate: wins / Math.max(1, results.length),
      averageAddRowsUsed: avg(results.map((r) => r.addRowsUsed)),
      averageBoardHeight: avg(results.map((r) => r.maxBoardHeight)),
      rescueActivations: results.reduce((sum, r) => sum + r.rescueActivations, 0)
    };
  }
}
