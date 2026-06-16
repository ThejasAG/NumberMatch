import { create } from "zustand";
import type { InspectionResult } from "./matchInspector.ts";

interface DebugState {
  debugMode: boolean;
  showAllValidMoves: boolean;
  history: InspectionResult[];
  
  toggleDebugMode: () => void;
  toggleShowAllValidMoves: () => void;
  addInspection: (result: InspectionResult) => void;
  clearHistory: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  debugMode: false,
  showAllValidMoves: false,
  history: [],
  
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  toggleShowAllValidMoves: () => set((state) => ({ showAllValidMoves: !state.showAllValidMoves })),
  
  addInspection: (result) => set((state) => {
    const newHistory = [result, ...state.history];
    if (newHistory.length > 50) {
      newHistory.length = 50;
    }
    return { history: newHistory };
  }),
  
  clearHistory: () => set({ history: [] })
}));
