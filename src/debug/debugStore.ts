import { create } from "zustand";
import type { InspectionResult } from "./matchInspector.ts";
import type { HintResult } from "../hintEngine.ts";

export interface AddRowMetrics {
  validPairsCount: number;
  remainingNumbers: number;
  blocked: boolean;
  blockReason: string;
}

interface DebugState {
  debugMode: boolean;
  showAllValidMoves: boolean;
  history: InspectionResult[];
  lastHint: HintResult | null;
  lastHintCandidatesCount: number;
  lastAddRowMetrics: AddRowMetrics | null;
  
  toggleDebugMode: () => void;
  toggleShowAllValidMoves: () => void;
  addInspection: (result: InspectionResult) => void;
  setLastHint: (hint: HintResult, candidatesCount: number) => void;
  setAddRowMetrics: (metrics: AddRowMetrics) => void;
  clearHistory: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  debugMode: false,
  showAllValidMoves: false,
  history: [],
  lastHint: null,
  lastHintCandidatesCount: 0,
  lastAddRowMetrics: null,
  
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  toggleShowAllValidMoves: () => set((state) => ({ showAllValidMoves: !state.showAllValidMoves })),
  
  addInspection: (result) => set((state) => {
    const newHistory = [result, ...state.history];
    if (newHistory.length > 50) {
      newHistory.length = 50;
    }
    return { history: newHistory };
  }),
  
  setLastHint: (hint, candidatesCount) => set({ lastHint: hint, lastHintCandidatesCount: candidatesCount }),

  setAddRowMetrics: (metrics) => set({ lastAddRowMetrics: metrics }),

  clearHistory: () => set({ history: [] })
}));
