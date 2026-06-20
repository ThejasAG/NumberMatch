import { BoardEngine } from "./boardEngine.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";
import type { CellValue, LevelBoardAnalytics, LevelData, Pair } from "./models.ts";
import { complementOf, deterministicSeed, isMatchingValue, SeededSequence } from "./seeded.ts";
import { SolutionGraphGenerator } from "./solutionGraphGenerator.ts";

export class LevelGenerator {
  private graphGenerator: SolutionGraphGenerator;
  private difficulty: DifficultyEngine;

  constructor(graphGenerator?: SolutionGraphGenerator, difficulty = new DifficultyEngine()) {
    this.difficulty = difficulty;
    this.graphGenerator = graphGenerator ?? new SolutionGraphGenerator(this.difficulty);
  }

  generateLevel(level: number, attempt = 1): LevelData {
    const profile = this.difficulty.getDifficultyProfile(level);
    const maxGenerationAttempts = profile.validation ? 50 : 1;

    for (let offset = 0; offset < maxGenerationAttempts; offset++) {
      const generationAttempt = attempt + offset;
      const seed = deterministicSeed(level, generationAttempt);
      const rng = new SeededSequence(seed);
      const graph = this.graphGenerator.generateSolutionGraph(level, seed);
      const isLevelOne = ((level - 1) % 10) + 1 === 1;
      const board = isLevelOne
        ? this.buildLevelOneBoard(graph, rng)
        : this.buildDefaultBoard(graph, rng);
      const engine = new BoardEngine(board);
      const analytics = this.calculateBoardAnalytics(engine, graph);
      const levelData = {
        level,
        attempt,
        seed,
        graph,
        board,
        difficultyScore: (profile.scoreRange[0] + profile.scoreRange[1]) / 2,
        matchDensity: this.calculateMatchDensity(engine),
        decoyDensity: this.calculateDecoyDensity(engine),
        pairDistance: this.calculatePairDistance(engine),
        analytics
      };

      if (!profile.validation || this.validateLevel(levelData)) return levelData;
    }

    throw new Error(`Unable to generate a valid Level ${level} board for attempt ${attempt}.`);
  }

  validateLevel(levelData: LevelData): boolean {
    const board = new BoardEngine(levelData.board);
    const profile = this.difficulty.getDifficultyProfile(levelData.level);
    const rules = profile.validation;
    const baseValid = this.graphGenerator.validateGraph(levelData.graph)
      && levelData.board.length === 3
      && levelData.board.every((row) => row.length === BoardEngine.width)
      && board.findAllValidPairs().length > 0;

    if (!baseValid) return false;
    if (!rules) return true;

    const analytics = this.calculateBoardAnalytics(board, levelData.graph);
    return analytics.initialReachablePairs >= rules.minReachablePairs
      && analytics.boardDiversityScore >= rules.minDigitDiversity
      && analytics.solutionGraphBranchingFactor >= rules.minSolutionBranches
      && analytics.deadlockFrequency <= rules.maxDeadlocks
      && analytics.addRowDependencyScore <= (rules.maxAddRowDependencyScore ?? 1);
  }

  calculateBoardAnalytics(board: BoardEngine, graph = this.graphGenerator.generateSolutionGraph(1)): LevelBoardAnalytics {
    const initialReachablePairs = board.findAllValidPairs().length;
    return {
      initialReachablePairs,
      solutionGraphBranchingFactor: graph.branchingFactor,
      deadlockFrequency: this.calculateDeadlockFrequency(board),
      addRowDependencyScore: graph.hiddenPairCount / Math.max(1, graph.totalPairs),
      boardDiversityScore: this.calculateBoardDiversity(board)
    };
  }

  private buildDefaultBoard(graph: LevelData["graph"], rng: SeededSequence): CellValue[][] {
    const values: number[] = [];
    for (const node of graph.nodes) values.push(...node.values);
    values.push(complementOf(values[values.length - 1]));

    const directPairs = graph.nodes.slice(0, graph.directPairCount).flatMap((n) => n.values);
    const hiddenValues = values.slice(directPairs.length);
    const cells = [...directPairs, ...this.deterministicShuffle(hiddenValues, rng)].slice(0, 27);
    return this.toRows(cells);
  }

  private buildLevelOneBoard(graph: LevelData["graph"], rng: SeededSequence): CellValue[][] {
    const directPairs = graph.nodes.slice(0, graph.directPairCount).map((n) => n.values);
    const shuffledPairs = this.deterministicShuffle(directPairs, rng);
    const directValues = shuffledPairs.flat();
    const hidden = graph.nodes[graph.directPairCount]?.values[0] ?? 5;
    return this.toRows([...directValues, hidden].slice(0, 27));
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

  calculateBoardDiversity(board: BoardEngine): number {
    return new Set(board.getRemainingNumbers()).size / 9;
  }

  exportLevel(levelData: LevelData): string {
    return JSON.stringify(levelData, null, 2);
  }

  private deterministicShuffle<T>(values: T[], rng: SeededSequence): T[] {
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

  private calculateDeadlockFrequency(board: BoardEngine): number {
    const policies = [
      (pairs: Pair[]) => pairs[0],
      (pairs: Pair[]) => pairs[pairs.length - 1],
      (pairs: Pair[]) => this.byDistance(pairs, "asc")[0],
      (pairs: Pair[]) => this.byDistance(pairs, "desc")[0],
      (pairs: Pair[], step: number) => pairs[step % pairs.length]
    ];
    let deadlocks = 0;

    for (const policy of policies) {
      const probe = new BoardEngine(board.getBoardState());
      for (let step = 0; step < 30; step++) {
        const remaining = probe.getRemainingNumbers().length;
        const pairs = probe.findAllValidPairs();
        if (pairs.length === 0) {
          if (remaining > 1) deadlocks++;
          break;
        }
        const pair = policy(pairs, step);
        probe.removePair(pair.a, pair.b);
      }
    }

    return deadlocks / policies.length;
  }

  private byDistance(pairs: Pair[], direction: "asc" | "desc"): Pair[] {
    return pairs.slice().sort((a, b) => {
      const distanceA = Math.abs(a.a.row - a.b.row) + Math.abs(a.a.col - a.b.col);
      const distanceB = Math.abs(b.a.row - b.b.row) + Math.abs(b.a.col - b.b.col);
      return direction === "asc" ? distanceA - distanceB : distanceB - distanceA;
    });
  }
}
