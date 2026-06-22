import { BoardEngine } from "./boardEngine.ts";
import { deterministicSeed, SeededSequence, complementOf } from "./seeded.ts";

export class RescueEngine {
  private failedAddRows = 0;

  isStuck(board: BoardEngine): boolean {
    return !board.isBoardEmpty() && board.findAllValidPairs().length === 0;
  }

  trackFailedAddRows(board: BoardEngine): number {
    this.failedAddRows = board.findAllValidPairs().length === 0 ? this.failedAddRows + 1 : 0;
    return this.failedAddRows;
  }

  shouldTriggerRescue(board: BoardEngine): boolean {
    return (this.isStuck(board) && this.failedAddRows >= 2) || board.getRemainingNumbers().length <= 3;
  }

  generateRescueRow(level = 1, attempt = 1): number[] {
    const rng = new SeededSequence(deterministicSeed(level, attempt));
    const a = rng.pick([1, 2, 3, 4, 5, 8]);
    const b = a === 8 || a === 5 ? a : complementOf(a);
    const row = [a, b];
    while (row.length < BoardEngine.width) row.push(rng.int(1, 9));
    return row;
  }

  validateRescueSuccess(row: number[], board?: BoardEngine): boolean {
    if (!board) {
      const probe = new BoardEngine([row]);
      return probe.findAllValidPairs().length > 0;
    }
    const initialRemaining = board.getRemainingNumbers().length;
    const state = board.getBoardState();
    const probe = new BoardEngine(state);
    probe.addRow(row.slice());
    
    const pairs = probe.findAllValidPairs();
    if (pairs.length === 0) return false;
    
    probe.removePair(pairs[0].a, pairs[0].b);
    if (probe.getRemainingNumbers().length >= initialRemaining) return false;
    
    let moves = 1;
    while(moves < 20) {
      const remainingPairs = probe.findAllValidPairs();
      if (remainingPairs.length === 0) break;
      probe.removePair(remainingPairs[0].a, remainingPairs[0].b);
      moves++;
    }
    
    return probe.getRemainingNumbers().length < initialRemaining;
  }

  resetAfterSuccessfulMatch(): void {
    this.failedAddRows = 0;
  }
}
