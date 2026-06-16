import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cell, CellValue } from "../../models.ts";
import { NumberMatchSession } from "../engine/NumberMatchSession.ts";
import { HintEngine, type HintResult } from "../../hintEngine.ts";
import { soundManager } from "../sound/SoundManager.ts";
import { inspectMatch } from "../../debug/matchInspector.ts";
import { useDebugStore } from "../../debug/debugStore.ts";

interface ProgressState {
  unlockedLevel: number;
  lastLevel: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  bestScores: Record<number, number>;
}

interface RuntimeState {
  session: NumberMatchSession | null;
  board: CellValue[][];
  level: number;
  attempt: number;
  selected: Cell | null;
  addRowsUsed: number;
  remainingAddRows: number;
  hintsRemaining: number;
  activeHint: HintResult | null;
  hintSuggestHighlight: boolean;
  lastAddRowBlockedAt: number;
  score: number;
  hintsUsed: number;
  status: "idle" | "playing" | "won" | "lost";
  message: string;
}

interface GameStore extends ProgressState, RuntimeState {
  startLevel: (level: number) => void;
  selectCell: (cell: Cell) => void;
  addRow: () => void;
  useHint: () => void;
  clearSelection: () => void;
  completeLevel: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  resetProgress: () => void;
}

const initialRuntime: RuntimeState = {
  session: null,
  board: [],
  level: 1,
  attempt: 1,
  selected: null,
  addRowsUsed: 0,
  remainingAddRows: 6,
  hintsRemaining: 3,
  activeHint: null,
  hintSuggestHighlight: false,
  lastAddRowBlockedAt: 0,
  score: 0,
  hintsUsed: 0,
  status: "idle",
  message: ""
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      unlockedLevel: 1,
      lastLevel: 1,
      soundEnabled: true,
      hapticsEnabled: true,
      bestScores: {},
      ...initialRuntime,

      startLevel: (level) => {
        const attempt = Date.now() % 100000;
        const session = new NumberMatchSession(level, attempt);
        set({
          session,
          board: session.getBoard(),
          level,
          attempt,
          selected: null,
          addRowsUsed: 0,
          remainingAddRows: 6,
          hintsRemaining: 3,
          activeHint: null,
          hintSuggestHighlight: false,
          lastAddRowBlockedAt: 0,
          score: 0,
          hintsUsed: 0,
          status: "playing",
          message: ""
        });
      },

      selectCell: (cell) => {
        const { session, selected, board, soundEnabled } = get();
        if (!session || board[cell.row]?.[cell.col] === null) return;
        soundManager.setEnabled(soundEnabled);

        // Clear hint on any cell selection
        set({ activeHint: null });

        if (!selected) {
          soundManager.play("tap");
          set({ selected: cell, message: "" });
          return;
        }
        if (selected.row === cell.row && selected.col === cell.col) {
          set({ selected: null });
          return;
        }
        const inspection = inspectMatch(session.getBoardEngine(), selected, cell);
        useDebugStore.getState().addInspection(inspection);

        const valA = board[selected.row][selected.col];
        const valB = board[cell.row][cell.col];
        const rowABefore = board[selected.row].every(c => c === null);
        const rowBBefore = board[cell.row].every(c => c === null);

        if (!session.canMatch(selected, cell)) {
          soundManager.play("error");
          set({ selected: cell, message: "No match" });
          return;
        }
        const result = session.match(selected, cell);
        if (!result.matched) {
          soundManager.play("error");
          set({ selected: cell, message: "No match" });
          return;
        }
        soundManager.play(result.won ? "win" : "match");
        
        const { score, level, bestScores } = get();
        let matchScore = 0;
        if (valA === valB) matchScore += 10;
        if (valA !== null && valB !== null && valA !== valB && valA + valB === 10) matchScore += 15;
        if (result.debug.pathType === "diagonal") matchScore += 5;
        if (result.debug.pathType === "wrap") matchScore += 5;
        
        const rowAAfter = result.board[selected.row] && result.board[selected.row].every(c => c === null);
        const rowBAfter = result.board[cell.row] && result.board[cell.row].every(c => c === null);
        if (!rowABefore && rowAAfter) matchScore += 10;
        if (!rowBBefore && rowBAfter && selected.row !== cell.row) matchScore += 10;
        
        if (result.won) matchScore += 100;
        
        const newScore = Math.max(0, score + matchScore);
        const currentBest = bestScores[level] || 0;
        const newBestScores = newScore > currentBest ? { ...bestScores, [level]: newScore } : bestScores;

        set({
          board: result.board,
          selected: null,
          lastAddRowBlockedAt: 0, // Reset bypass on successful match
          hintSuggestHighlight: false,
          score: newScore,
          bestScores: newBestScores,
          status: result.won ? "won" : "playing",
          message: result.won ? "Level clear" : ""
        });
      },

      addRow: () => {
        const { session, soundEnabled, hintsRemaining, lastAddRowBlockedAt, score, level, bestScores } = get();
        if (!session) return;

        const validPairsCount = session.getValidPairs().length;
        const remainingNumbers = session.getBoardEngine().getRemainingNumbers().length;
        const now = Date.now();

        let shouldBlock = false;
        let blockReason = "";

        // Gatekeeper Logic
        if (remainingNumbers > 1 && validPairsCount > 0) {
          if (lastAddRowBlockedAt > 0 && (now - lastAddRowBlockedAt) >= 3000) {
            // Bypass allowed! Reset so next addRow is blocked again
            set({ lastAddRowBlockedAt: 0 });
          } else {
            shouldBlock = true;
            blockReason = "Valid matches still exist. Clear existing moves first.";
            set({ lastAddRowBlockedAt: now });
          }
        }

        if (useDebugStore.getState().debugMode) {
          useDebugStore.getState().setAddRowMetrics({
            validPairsCount,
            remainingNumbers,
            blocked: shouldBlock,
            blockReason
          });
        }

        soundManager.setEnabled(soundEnabled);

        if (shouldBlock) {
          soundManager.play("error");
          set({ message: blockReason });

          if (hintsRemaining > 0) {
            set({ hintSuggestHighlight: true });
            setTimeout(() => {
              const current = useGameStore.getState().hintSuggestHighlight;
              if (current) set({ hintSuggestHighlight: false });
            }, 2000);
          }
          return;
        }

        const result = session.addRow();
        if (!result.added && result.lost) {
          soundManager.play("lose");
          set({ status: "lost", message: "No rows left" });
          return;
        }
        
        const newScore = Math.max(0, score - 20);
        const currentBest = bestScores[level] || 0;
        const newBestScores = newScore > currentBest ? { ...bestScores, [level]: newScore } : bestScores;

        soundManager.play("row");
        set({
          board: result.board,
          selected: null,
          activeHint: null,
          score: newScore,
          bestScores: newBestScores,
          addRowsUsed: session.getAddRowsUsed(),
          remainingAddRows: session.getRemainingAddRows(),
          message: result.rescued ? "Rescue row" : ""
        });
      },

      useHint: () => {
        const { session, hintsRemaining, soundEnabled, score, hintsUsed, level, bestScores } = get();
        if (!session || hintsRemaining <= 0) return;

        const engine = new HintEngine();
        const hint = engine.getHint(session.getBoardEngine());

        soundManager.setEnabled(soundEnabled);

        if (hint) {
          soundManager.play("hint");
          if (useDebugStore.getState().debugMode) {
            const candidatesCount = engine.getHintCandidatesCount(session.getBoardEngine());
            console.log("HINT GENERATED\nPair:", hint.pair, "\nReason:", hint.reason, "\nScore:", hint.score);
            useDebugStore.getState().setLastHint(hint, candidatesCount);
          }
          
          const newScore = Math.max(0, score - 10);
          const currentBest = bestScores[level] || 0;
          const newBestScores = newScore > currentBest ? { ...bestScores, [level]: newScore } : bestScores;

          set({
            activeHint: hint,
            hintsRemaining: hintsRemaining - 1,
            hintsUsed: hintsUsed + 1,
            score: newScore,
            bestScores: newBestScores,
            message: hint.reason,
            selected: null
          });
        } else {
          soundManager.play("error");
          set({
            message: session.getRemainingAddRows() > 0 ? "No valid matches found. Try Add Row." : "No valid matches found.",
            activeHint: null
          });
        }
      },

      clearSelection: () => set({ selected: null }),

      completeLevel: () => {
        const { level, unlockedLevel } = get();
        set({ unlockedLevel: Math.max(unlockedLevel, level + 1), lastLevel: level + 1 });
      },

      setSoundEnabled: (enabled) => {
        soundManager.setEnabled(enabled);
        set({ soundEnabled: enabled });
      },

      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),

      resetProgress: () => set({ unlockedLevel: 1, lastLevel: 1, ...initialRuntime })
    }),
    {
      name: "number-match-progress",
      partialize: (state) => ({
        unlockedLevel: state.unlockedLevel,
        lastLevel: state.lastLevel,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        bestScores: state.bestScores
      })
    }
  )
);
