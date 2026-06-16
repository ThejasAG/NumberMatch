import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cell, CellValue } from "../../models.ts";
import { NumberMatchSession } from "../engine/NumberMatchSession.ts";
import { soundManager } from "../sound/SoundManager.ts";
import { inspectMatch } from "../../debug/matchInspector.ts";
import { useDebugStore } from "../../debug/debugStore.ts";

interface ProgressState {
  unlockedLevel: number;
  lastLevel: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

interface RuntimeState {
  session: NumberMatchSession | null;
  board: CellValue[][];
  level: number;
  attempt: number;
  selected: Cell | null;
  addRowsUsed: number;
  remainingAddRows: number;
  status: "idle" | "playing" | "won" | "lost";
  message: string;
}

interface GameStore extends ProgressState, RuntimeState {
  startLevel: (level: number) => void;
  selectCell: (cell: Cell) => void;
  addRow: () => void;
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
          status: "playing",
          message: ""
        });
      },

      selectCell: (cell) => {
        const { session, selected, board, soundEnabled } = get();
        if (!session || board[cell.row]?.[cell.col] === null) return;
        soundManager.setEnabled(soundEnabled);
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
        set({
          board: result.board,
          selected: null,
          status: result.won ? "won" : "playing",
          message: result.won ? "Level clear" : ""
        });
      },

      addRow: () => {
        const { session, soundEnabled } = get();
        if (!session) return;
        soundManager.setEnabled(soundEnabled);
        const result = session.addRow();
        if (!result.added && result.lost) {
          soundManager.play("lose");
          set({ status: "lost", message: "No rows left" });
          return;
        }
        soundManager.play("row");
        set({
          board: result.board,
          selected: null,
          addRowsUsed: session.getAddRowsUsed(),
          remainingAddRows: session.getRemainingAddRows(),
          message: result.rescued ? "Rescue row" : ""
        });
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
        hapticsEnabled: state.hapticsEnabled
      })
    }
  )
);
