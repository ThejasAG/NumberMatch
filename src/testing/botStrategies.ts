import { BoardEngine } from "../boardEngine.ts";
import type { Pair } from "../models.ts";

export interface BotStrategy {
  chooseMove(board: BoardEngine): Pair | null;
  wantsAddRow(board: BoardEngine, addRowsUsed: number): boolean;
  makeMistake(): boolean;
}

export class GreedyBot implements BotStrategy {
  chooseMove(board: BoardEngine): Pair | null {
    const pairs = board.findAllValidPairs();
    if (pairs.length === 0) return null;
    return pairs[0]; // First valid pair
  }

  wantsAddRow(board: BoardEngine, addRowsUsed: number): boolean {
    return true; // Always want add row if stuck
  }

  makeMistake(): boolean {
    return false; // Greedy bot doesn't make mistakes
  }
}

export class SmartBot implements BotStrategy {
  chooseMove(board: BoardEngine): Pair | null {
    // Without hint engine, smart bot just finds all valid pairs and picks the first.
    // In a real scenario it might evaluate "best" pair based on distance or sparseness.
    // We will just pick a pair. To be slightly "smarter", we could pick the closest pair.
    const pairs = board.findAllValidPairs();
    if (pairs.length === 0) return null;
    
    // Sort by distance to simulate a "smart" choice without using hints
    pairs.sort((p1, p2) => {
      const dist1 = Math.abs(p1.a.row - p1.b.row) + Math.abs(p1.a.col - p1.b.col);
      const dist2 = Math.abs(p2.a.row - p2.b.row) + Math.abs(p2.a.col - p2.b.col);
      return dist1 - dist2;
    });

    return pairs[0];
  }

  wantsAddRow(board: BoardEngine, addRowsUsed: number): boolean {
    return true;
  }

  makeMistake(): boolean {
    return false;
  }
}

export class HumanLikeBot implements BotStrategy {
  chooseMove(board: BoardEngine): Pair | null {
    const pairs = board.findAllValidPairs();
    if (pairs.length === 0) return null;

    // 90% "smart" move, 10% random valid move
    if (Math.random() < 0.9) {
      pairs.sort((p1, p2) => {
        const dist1 = Math.abs(p1.a.row - p1.b.row) + Math.abs(p1.a.col - p1.b.col);
        const dist2 = Math.abs(p2.a.row - p2.b.row) + Math.abs(p2.a.col - p2.b.col);
        return dist1 - dist2;
      });
      return pairs[0];
    }

    // Random valid move
    const randomIndex = Math.floor(Math.random() * pairs.length);
    return pairs[randomIndex];
  }

  wantsAddRow(board: BoardEngine, addRowsUsed: number): boolean {
    // May delay Add Row sometimes
    return Math.random() > 0.1;
  }

  makeMistake(): boolean {
    // 10% mistake rate to track "Mistakes" metric
    return Math.random() < 0.1;
  }
}
