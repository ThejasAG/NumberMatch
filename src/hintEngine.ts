import { BoardEngine } from "./boardEngine.ts";
import type { Pair } from "./models.ts";

export interface HintResult {
  pair: Pair;
  reason: string;
  score: number;
}

export class HintEngine {
  getHint(board: BoardEngine): HintResult | null {
    const pairs = board.findAllValidPairs();
    if (pairs.length === 0) return null;

    let bestHint: HintResult | null = null;

    for (const pair of pairs) {
      const { score, reason } = this.evaluatePair(board, pair);
      if (!bestHint || score > bestHint.score) {
        bestHint = { pair, reason, score };
      }
    }

    return bestHint;
  }

  getHintCandidatesCount(board: BoardEngine): number {
    return board.findAllValidPairs().length;
  }

  private evaluatePair(board: BoardEngine, pair: Pair): { score: number; reason: string } {
    let score = 0;
    const valA = board.valueAt(pair.a)!;
    const valB = board.valueAt(pair.b)!;
    const debug = board.getMatchDebugInfo(pair.a, pair.b);
    
    const isSum = valA !== valB && valA + valB === 10;
    let reason = isSum ? `Try matching ${valA} + ${valB}` : `Same number match available`;

    if (debug.pathType === "diagonal") reason = "Diagonal match available";
    if (debug.pathType === "wrap") reason = "Wrap match available";

    // 1. Difficulty Weight: Longer distances are generally harder to spot
    const distance = Math.abs(pair.a.row - pair.b.row) + Math.abs(pair.a.col - pair.b.col);
    score += distance;

    // 2. Future Unlock Weight: Spanning multiple rows can bring lines closer
    const span = Math.abs(pair.a.row - pair.b.row);
    if (span > 0) {
      score += 15 * span;
    }

    // 3. Cleanup Weight: Prioritize moves that clear rows
    const isCleanup = this.isRowCleanup(board, pair);
    if (isCleanup) {
      score += 50;
      reason = "This move helps clear a sparse row";
    }

    return { score, reason };
  }

  private isRowCleanup(board: BoardEngine, pair: Pair): boolean {
    const rowA = pair.a.row;
    const rowB = pair.b.row;
    
    let remainingInRowA = 0;
    for (let c = 0; c < BoardEngine.width; c++) {
      if (board.valueAt({ row: rowA, col: c }) !== null) remainingInRowA++;
    }

    let remainingInRowB = 0;
    for (let c = 0; c < BoardEngine.width; c++) {
      if (board.valueAt({ row: rowB, col: c }) !== null) remainingInRowB++;
    }

    if (rowA === rowB) {
      return remainingInRowA === 2;
    } else {
      return remainingInRowA === 1 || remainingInRowB === 1;
    }
  }
}
