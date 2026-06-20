import type { GameBotResult } from "./gameBot.ts";

export class SimulationHistoryDatabase {
  private history: GameBotResult[] = [];

  addResult(result: GameBotResult) {
    this.history.push(result);
  }

  getAllResults(): GameBotResult[] {
    return this.history;
  }

  getResultsByLevel(level: number): GameBotResult[] {
    return this.history.filter(r => r.level === level);
  }

  clear() {
    this.history = [];
  }
}
