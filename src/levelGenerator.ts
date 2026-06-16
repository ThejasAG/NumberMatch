import { BoardEngine } from "./boardEngine.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";
import type { CellValue, LevelData } from "./models.ts";
import { complementOf, deterministicSeed, isMatchingValue, SeededSequence } from "./seeded.ts";
import { SolutionGraphGenerator } from "./solutionGraphGenerator.ts";

export class LevelGenerator {
  private graphGenerator: SolutionGraphGenerator;
  private difficulty: DifficultyEngine;

  constructor(graphGenerator = new SolutionGraphGenerator(), difficulty = new DifficultyEngine()) {
    this.graphGenerator = graphGenerator;
    this.difficulty = difficulty;
  }

  generateLevel(level: number, attempt = 1): LevelData {
    const seed = deterministicSeed(level, attempt);
    const rng = new SeededSequence(seed);
    const graph = this.graphGenerator.generateSolutionGraph(level, seed);
    const profile = this.difficulty.getDifficultyProfile(level);
    const values: number[] = [];

    for (const node of graph.nodes) values.push(...node.values);
    values.push(complementOf(values[values.length - 1]));

    const directPairs = graph.nodes.slice(0, graph.directPairCount).flatMap((n) => n.values);
    const hiddenValues = values.slice(directPairs.length);
    const cells = [...directPairs, ...this.deterministicShuffle(hiddenValues, rng)].slice(0, 27);
    const board = this.toRows(cells);
    const engine = new BoardEngine(board);

    return {
      level,
      attempt,
      seed,
      graph,
      board,
      difficultyScore: (profile.scoreRange[0] + profile.scoreRange[1]) / 2,
      matchDensity: this.calculateMatchDensity(engine),
      decoyDensity: this.calculateDecoyDensity(engine),
      pairDistance: this.calculatePairDistance(engine)
    };
  }

  validateLevel(levelData: LevelData): boolean {
    const board = new BoardEngine(levelData.board);
    return this.graphGenerator.validateGraph(levelData.graph)
      && levelData.board.length === 3
      && levelData.board.every((row) => row.length === BoardEngine.width)
      && board.findAllValidPairs().length > 0;
  }

  calculateMatchDensity(board: BoardEngine): number {
    return board.findAllValidPairs().length / Math.max(1, board.getRemainingNumbers().length);
  }

  calculateDecoyDensity(board: BoardEngine): number {
    const values = board.getRemainingNumbers();
    const decoys = values.filter((v, i) => !values.some((x, j) => i !== j && isMatchingValue(v, x))).length;
    return decoys / Math.max(1, values.length);
  }

  calculatePairDistance(board: BoardEngine): number {
    const pairs = board.findAllValidPairs();
    if (pairs.length === 0) return 0;
    const total = pairs.reduce((sum, pair) => sum + Math.abs(pair.a.row - pair.b.row) + Math.abs(pair.a.col - pair.b.col), 0);
    return total / pairs.length;
  }

  exportLevel(levelData: LevelData): string {
    return JSON.stringify(levelData, null, 2);
  }

  private deterministicShuffle(values: number[], rng: SeededSequence): number[] {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private toRows(values: number[]): CellValue[][] {
    const rows: CellValue[][] = [];
    for (let i = 0; i < 27; i += BoardEngine.width) rows.push(values.slice(i, i + BoardEngine.width));
    return rows;
  }
}
