import { BoardEngine } from "../boardEngine.ts";
import { LevelGenerator } from "../levelGenerator.ts";
import { SmartAddRowEngine } from "../addRowEngine.ts";
import { RescueEngine } from "../rescueEngine.ts";
import { DifficultyEngine } from "../difficultyEngine.ts";
import type { BotStrategy } from "./botStrategies.ts";

export const RescueMode = {
  DEVELOPER: "DEVELOPER",
  PRODUCTION: "PRODUCTION"
} as const;

export type RescueMode = typeof RescueMode[keyof typeof RescueMode];

export interface GameBotResult {
  simulationId: number;
  level: number;
  botType: string;
  completed: boolean;
  completionTimeSeconds: number;
  moves: number;
  addRowsUsed: number;
  rescuesTriggered: number;
  mistakes: number;
  score: number;
  remainingNumbers: number;
  averageFutureSolvability: number;
  addRowSuccessRate: number;
  averageReachableMatchScore: number;
  averageProjectedWinScore: number;
  averageBoardAwareHelpfulnessScore: number;
  criticalStuckRate: number;
  averageDiversityScore: number;
  averagePairDiversityScore: number;
  initialReachablePairs: number;
  solutionGraphBranchingFactor: number;
  deadlockFrequency: number;
  addRowDependencyScore: number;
  boardDiversityScore: number;
  digitDistribution: Record<number, number>;
  rescueModeTriggered: boolean;
  remainingNumbersAtFailure: number;
  wonWithRescue: boolean;
  wonWithoutRescue: boolean;
}

export class GameBot {
  private levelGenerator = new LevelGenerator();
  private addRowEngine = new SmartAddRowEngine();
  private rescueEngine = new RescueEngine();
  private difficultyEngine = new DifficultyEngine();
  private strategy: BotStrategy;
  private botName: string;
  private rescueMode: RescueMode;
  
  constructor(strategy: BotStrategy, botName: string, options?: { difficultyEngine?: DifficultyEngine, rescueMode?: RescueMode }) {
    this.strategy = strategy;
    this.botName = botName;
    this.rescueMode = options?.rescueMode ?? RescueMode.PRODUCTION;
    if (options?.difficultyEngine) {
      this.difficultyEngine = options.difficultyEngine;
      this.levelGenerator = new LevelGenerator(undefined, this.difficultyEngine);
      this.addRowEngine = new SmartAddRowEngine(this.difficultyEngine);
    }
  }

  public async play(simulationId: number, level: number, attempt = 1): Promise<GameBotResult> {
    const levelData = this.levelGenerator.generateLevel(level, attempt);
    const board = new BoardEngine(levelData.board);
    
    let moves = 0;
    let addRowsUsed = 0;
    let rescuesTriggered = 0;
    let mistakes = 0;
    let score = 0;
    let totalHelpfulness = 0;
    let totalFutureSolvability = 0;
    let successfulAddRows = 0;
    let totalReachableMatches = 0;
    let totalProjectedWinScore = 0;
    let totalBoardAwareHelpfulnessScore = 0;
    let criticalStuckCount = 0;
    let totalDiversity = 0;
    let totalPairDiversity = 0;
    const digitDistribution: Record<number, number> = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
    let rescueModeTriggered = false;

    let isStuck = false;
    let simulatedTimeSeconds = 0;
    const moveTimeSeconds = level === 1 ? 3 : 1.5;

    const maxAddRows = this.difficultyEngine.getMaxAddRows(level);

    while (!board.isBoardEmpty() && !isStuck) {
      if (this.strategy.makeMistake()) {
        mistakes++;
        simulatedTimeSeconds += 2; // Mistakes take time
      }

      const pair = this.strategy.chooseMove(board);
      if (pair) {
        board.removePair(pair.a, pair.b);
        this.rescueEngine.resetAfterSuccessfulMatch();
        moves++;
        score += 10; // Basic scoring
        simulatedTimeSeconds += moveTimeSeconds;
        continue;
      }

      // Stuck
      const validPairs = board.findAllValidPairs().length;
      if (validPairs === 0 && !board.isBoardEmpty()) {
        if (this.strategy.wantsAddRow(board, addRowsUsed) && addRowsUsed < maxAddRows) {
          const currentRemaining = board.getRemainingNumbers();
          
          const isDevModeTrigger = this.rescueMode === RescueMode.DEVELOPER && currentRemaining.length <= 3;
          const isProdModeTrigger = this.rescueMode === RescueMode.PRODUCTION && currentRemaining.length <= 3 && (maxAddRows - addRowsUsed) <= 2;
          
          if (isDevModeTrigger || isProdModeTrigger) {
             // PHASE 8.1 / 9: Minimal Rescue Row Trigger
             rescueModeTriggered = true;
             const row = this.addRowEngine.generateMinimalRescueRow(board, currentRemaining);
             for (let i = 0; i < row.length; i += BoardEngine.width) {
               board.addRow(row.slice(i, i + BoardEngine.width));
             }
             if (board.findAllValidPairs().length > 0) {
               successfulAddRows++;
             }
          } else {
            this.rescueEngine.trackFailedAddRows(board);
            if (isDevModeTrigger || isProdModeTrigger) {
             const row = this.addRowEngine.generateAddRow(board, { level, attempt, remainingAddRows: maxAddRows - addRowsUsed });
             for (let i = 0; i < row.length; i += BoardEngine.width) {
               board.addRow(row.slice(i, i + BoardEngine.width));
             }
             this.rescueEngine.resetAfterSuccessfulMatch();
              score -= 5;
            } else {
              const row = this.addRowEngine.generateAddRow(board, { level, attempt, remainingAddRows: maxAddRows - addRowsUsed });
              const helpfulness = this.addRowEngine.calculateHelpfulness(row, board);
              const solvability = this.addRowEngine.calculateFutureSolvability(row, board);
              const reachableMatches = this.addRowEngine.calculateReachableMatches(row, board);
              const projectedWinScore = this.addRowEngine.calculateProjectedWinScore(row, board);
              const boardAwareHelp = this.addRowEngine.calculateBoardAwareHelpfulness(row, board);
              const diversity = this.addRowEngine.calculateDiversity(row);
              const pairDiversity = this.addRowEngine.calculatePairDiversity(row);
              
              totalFutureSolvability += solvability;
              totalReachableMatches += reachableMatches;
              totalProjectedWinScore += projectedWinScore;
              totalBoardAwareHelpfulnessScore += boardAwareHelp;
              if (reachableMatches === 0) criticalStuckCount++;
              
              totalDiversity += diversity;
              totalPairDiversity += pairDiversity;
              for (const val of row) {
                 if (val >= 1 && val <= 9) digitDistribution[val]++;
              }
              
              for (let i = 0; i < row.length; i += BoardEngine.width) {
                board.addRow(row.slice(i, i + BoardEngine.width));
              }
              if (board.findAllValidPairs().length > 0) {
                successfulAddRows++;
              }
            }
          }
          addRowsUsed++;
          simulatedTimeSeconds += 2; // Add row time
        } else {
          isStuck = true; // Bot refuses or cannot add row
        }
      } else {
         isStuck = true;
      }
    }

    const remainingNumbers = board.getRemainingNumbers().length;
    const validPairs = board.findAllValidPairs().length;
    const boardEmpty = board.isBoardEmpty();
    const completed = boardEmpty;

    console.log(`\n--- SIMULATION DIAGNOSTICS ---`);
    console.log(`Level: ${level}`);
    console.log(`Remaining Numbers: ${remainingNumbers}`);
    console.log(`Valid Pairs: ${validPairs}`);
    console.log(`Add Rows Used: ${addRowsUsed}`);
    console.log(`Board Empty: ${boardEmpty}`);
    console.log(`Completed: ${completed}`);
    console.log(`------------------------------\n`);

    const averageFutureSolvability = addRowsUsed > 0 ? totalFutureSolvability / addRowsUsed : 0;
    const addRowSuccessRate = addRowsUsed > 0 ? successfulAddRows / addRowsUsed : 0;
    const averageReachableMatchScore = addRowsUsed > 0 ? totalReachableMatches / addRowsUsed : 0;
    const averageProjectedWinScore = addRowsUsed > 0 ? totalProjectedWinScore / addRowsUsed : 0;
    const averageBoardAwareHelpfulnessScore = addRowsUsed > 0 ? totalBoardAwareHelpfulnessScore / addRowsUsed : 0;
    const criticalStuckRate = addRowsUsed > 0 ? criticalStuckCount / addRowsUsed : 0;
    const averageDiversityScore = addRowsUsed > 0 ? totalDiversity / addRowsUsed : 0;
    const averagePairDiversityScore = addRowsUsed > 0 ? totalPairDiversity / addRowsUsed : 0;

    return {
      simulationId,
      level,
      botType: this.botName,
      completed,
      completionTimeSeconds: Math.round(simulatedTimeSeconds),
      moves,
      addRowsUsed,
      rescuesTriggered,
      mistakes,
      score,
      remainingNumbers,
      averageFutureSolvability,
      addRowSuccessRate,
      averageReachableMatchScore,
      averageProjectedWinScore,
      averageBoardAwareHelpfulnessScore,
      criticalStuckRate,
      averageDiversityScore,
      averagePairDiversityScore,
      initialReachablePairs: levelData.analytics.initialReachablePairs,
      solutionGraphBranchingFactor: levelData.analytics.solutionGraphBranchingFactor,
      deadlockFrequency: levelData.analytics.deadlockFrequency,
      addRowDependencyScore: levelData.analytics.addRowDependencyScore,
      boardDiversityScore: levelData.analytics.boardDiversityScore,
      digitDistribution,
      rescueModeTriggered,
      remainingNumbersAtFailure: completed ? 0 : remainingNumbers,
      wonWithRescue: completed && rescueModeTriggered,
      wonWithoutRescue: completed && !rescueModeTriggered
    };
  }
}
