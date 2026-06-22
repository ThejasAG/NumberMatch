import type { SolutionGraph, SolutionPairNode } from "./models.ts";
import { complementOf, deterministicSeed, SeededSequence } from "./seeded.ts";
import { DifficultyEngine } from "./difficultyEngine.ts";

export class SolutionGraphGenerator {
  private difficulty: DifficultyEngine;

  constructor(difficulty = new DifficultyEngine()) {
    this.difficulty = difficulty;
  }

  generateSolutionGraph(level: number, seed = deterministicSeed(level, 1)): SolutionGraph {
    const profile = this.difficulty.getDifficultyProfile(level);
    const rng = new SeededSequence(seed);
    const isLevelOne = ((level - 1) % 10) + 1 === 1;
    const totalPairs = isLevelOne ? 14 : 13;
    const directPairCount = isLevelOne ? 13 : Math.max(1, Math.round(totalPairs * profile.matchDensity));
    const hiddenPairCount = totalPairs - directPairCount;
    const branchingFactor = profile.validation?.minSolutionBranches ?? (isLevelOne ? 5 : profile.pairDistance === "high" ? 3 : profile.pairDistance === "medium" ? 2 : 1);
    const nodes: SolutionPairNode[] = [];
    const levelOnePairs: [number, number][] = [];
    let digitPool: number[] = [];
    const refillPool = () => {
        digitPool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let j = digitPool.length - 1; j > 0; j--) {
            const k = Math.floor(rng.next() * (j + 1));
            [digitPool[j], digitPool[k]] = [digitPool[k], digitPool[j]];
        }
    };
    refillPool();

    if (isLevelOne) {
       for (let i = 0; i < totalPairs; i++) {
          if (digitPool.length === 0) refillPool();
          const a = digitPool.pop()!;
          const same = rng.next() < 0.25;
          const b = same ? a : complementOf(a);
          levelOnePairs.push([a, b]);
       }
    }

    for (let i = 0; i < totalPairs; i++) {
      if (digitPool.length === 0) refillPool();
      const a = isLevelOne ? levelOnePairs[i][0] : digitPool.pop()!;
      const same = rng.next() < 0.25;
      const values: [number, number] = isLevelOne ? levelOnePairs[i] : same ? [a, a] : [a, complementOf(a)];
      const route = i % Math.max(1, branchingFactor);
      const unlockAfter = i < directPairCount ? [] : [`p${directPairCount - 1}`];
      nodes.push({ id: `p${i}`, values, unlockAfter, route });
    }

    return { level, seed, totalPairs, branchingFactor, chainDepth: profile.chainDepth, hiddenPairCount, directPairCount, nodes };
  }

  validateGraph(graph: SolutionGraph): boolean {
    const ids = new Set(graph.nodes.map((n) => n.id));
    return graph.nodes.length === graph.totalPairs
      && graph.directPairCount > 0
      && graph.branchingFactor >= 1
      && graph.nodes.every((n) => n.unlockAfter.every((id) => ids.has(id)));
  }

  calculateGraphComplexity(graph: SolutionGraph): number {
    return Math.min(100, Math.round(graph.hiddenPairCount * 4 + graph.chainDepth * 10 + graph.branchingFactor * 8));
  }

  getSolutionPaths(graph: SolutionGraph): string[][] {
    const routes = new Map<number, string[]>();
    for (const node of graph.nodes) routes.set(node.route, [...(routes.get(node.route) ?? []), node.id]);
    return [...routes.values()];
  }

  exportGraph(graph: SolutionGraph): string {
    return JSON.stringify(graph, null, 2);
  }
}
