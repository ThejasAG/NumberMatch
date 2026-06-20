import { BotRunner } from "./botRunner.ts";
import { DifficultyEngine } from "../difficultyEngine.ts";
import type { DifficultyProfile } from "../models.ts";
import * as fs from "fs";
import * as path from "path";

export interface CandidateParams {
  matchDensity: number;
  decoyDensity: number;
  pairDistance: "low" | "medium" | "high";
  addRowHelpfulnessTarget: number;
  reachableMatchTarget: number;
  diversityTarget: number;
}

export interface CandidateResult {
  params: CandidateParams;
  fitness: number;
  metrics: {
    winRate: number;
    avgAddRows: number;
    avgCompletionTime: number;
    criticalStuckRate: number;
    oneNumberFailureRate: number;
    twoNumberFailureRate: number;
    threeNumberFailureRate: number;
    rescueModeTriggerCount: number;
    rescueSuccessRate: number;
    averageRemainingNumbersAtFailure: number;
  };
}

export class AutoTrainer {
  private populationSize = 20;
  private simulationsPerCandidate = 200;
  private maxDurationMs = 10 * 60 * 1000; // 10 minutes
  
  private cache = new Map<string, CandidateResult>();
  
  private stats = {
    uniqueCandidatesEvaluated: 0,
    clonesRejected: 0,
    mutationCount: 0,
    cacheHits: 0,
    bestFitnessHistory: [] as number[],
    populationDiversity: [] as number[],
  };

  private hashCandidate(c: CandidateParams): string {
    return `${c.matchDensity.toFixed(2)}_${c.decoyDensity.toFixed(2)}_${c.pairDistance}_${c.addRowHelpfulnessTarget.toFixed(0)}_${c.reachableMatchTarget}_${c.diversityTarget.toFixed(0)}`;
  }

  private baselineParams(level: number, engine: DifficultyEngine): CandidateParams {
    const profile = engine.getDifficultyProfile(level);
    return {
      matchDensity: profile.matchDensity,
      decoyDensity: profile.decoyDensity,
      pairDistance: profile.pairDistance,
      addRowHelpfulnessTarget: 50,
      reachableMatchTarget: level <= 4 ? 3 : 1,
      diversityTarget: level <= 4 ? 50 : 30
    };
  }

  private generateRandomCandidate(): CandidateParams {
    const distances: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
    return {
      matchDensity: 0.1 + Math.random() * 0.8,
      decoyDensity: Math.random() * 0.5,
      pairDistance: distances[Math.floor(Math.random() * distances.length)],
      addRowHelpfulnessTarget: 20 + Math.random() * 60,
      reachableMatchTarget: 1 + Math.floor(Math.random() * 4),
      diversityTarget: 20 + Math.random() * 60,
    };
  }

  private mutate(candidate: CandidateParams): CandidateParams {
    const mutated = { ...candidate };
    const mutationRate = 0.2;
    const fields = ['matchDensity', 'decoyDensity', 'pairDistance', 'addRowHelpfulnessTarget', 'reachableMatchTarget', 'diversityTarget'];
    const forcedField = fields[Math.floor(Math.random() * fields.length)];
    
    const tryMutate = (field: string) => Math.random() < mutationRate || field === forcedField;
    
    if (tryMutate('matchDensity')) {
      mutated.matchDensity = Math.max(0.1, Math.min(0.9, mutated.matchDensity + (Math.random() * 0.2 - 0.1)));
      this.stats.mutationCount++;
    }
    if (tryMutate('decoyDensity')) {
      mutated.decoyDensity = Math.max(0.0, Math.min(0.5, mutated.decoyDensity + (Math.random() * 0.1 - 0.05)));
      this.stats.mutationCount++;
    }
    if (tryMutate('pairDistance')) {
      const distances: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
      let newDist = distances[Math.floor(Math.random() * distances.length)];
      while(newDist === mutated.pairDistance && forcedField === 'pairDistance') {
          newDist = distances[Math.floor(Math.random() * distances.length)];
      }
      if (newDist !== mutated.pairDistance) this.stats.mutationCount++;
      mutated.pairDistance = newDist;
    }
    if (tryMutate('addRowHelpfulnessTarget')) {
      mutated.addRowHelpfulnessTarget = Math.max(20, Math.min(80, mutated.addRowHelpfulnessTarget + (Math.random() * 20 - 10)));
      this.stats.mutationCount++;
    }
    if (tryMutate('reachableMatchTarget')) {
      let change = Math.random() > 0.5 ? 1 : -1;
      if (mutated.reachableMatchTarget <= 1) change = 1;
      if (mutated.reachableMatchTarget >= 5) change = -1;
      mutated.reachableMatchTarget += change;
      this.stats.mutationCount++;
    }
    if (tryMutate('diversityTarget')) {
      mutated.diversityTarget = Math.max(20, Math.min(80, mutated.diversityTarget + (Math.random() * 20 - 10)));
      this.stats.mutationCount++;
    }
    return mutated;
  }

  private calculateFitness(metrics: CandidateResult["metrics"]): number {
    let score = metrics.winRate * 1000;
    score -= (metrics.avgAddRows * 100);
    score -= (metrics.criticalStuckRate * 500);
    score -= (metrics.oneNumberFailureRate * 1000);
    if (metrics.avgCompletionTime > 300) {
      score -= (metrics.avgCompletionTime - 300);
    }
    return score;
  }

  private calculateDiversity(pop: CandidateParams[]): number {
    const s = new Set(pop.map(p => this.hashCandidate(p)));
    return (s.size / pop.length) * 100;
  }

  public async train(level: number) {
    console.log(`Starting Auto Balance Training for Level ${level}...`);
    const startTime = Date.now();
    const history: { generation: number, bestFitness: number, bestParams: CandidateParams }[] = [];
    
    const standardEngine = new DifficultyEngine();
    let population: CandidateParams[] = [];
    
    const addUnique = (candidate: CandidateParams, isRandom: boolean, targetList: CandidateParams[], seen: Set<string>) => {
        let maxTries = 50;
        let c = candidate;
        while(maxTries > 0) {
            const h = this.hashCandidate(c);
            if (!seen.has(h)) {
                seen.add(h);
                targetList.push(c);
                return true;
            }
            if (isRandom) {
                c = this.generateRandomCandidate();
            } else {
                this.stats.clonesRejected++;
                c = this.mutate(c); 
            }
            maxTries--;
        }
        return false;
    };

    const initialSeen = new Set<string>();
    addUnique(this.baselineParams(level, standardEngine), false, population, initialSeen);
    while (population.length < this.populationSize) {
      addUnique(this.generateRandomCandidate(), true, population, initialSeen);
    }

    let generation = 1;
    let bestOverallCandidate: CandidateResult | null = null;
    let convergenceCounter = 0;

    while (Date.now() - startTime < this.maxDurationMs) {
      console.log(`\n--- Generation ${generation} ---`);
      const results: CandidateResult[] = [];

      for (let i = 0; i < population.length; i++) {
        const candidate = population[i];
        const hash = this.hashCandidate(candidate);
        
        if (this.cache.has(hash)) {
            this.stats.cacheHits++;
            results.push(this.cache.get(hash)!);
            continue;
        }

        const customDifficultyEngine = new DifficultyEngine();
        const baseProfile = customDifficultyEngine.getDifficultyProfile(level);
        const customProfile: DifficultyProfile = {
          ...baseProfile,
          matchDensity: candidate.matchDensity,
          decoyDensity: candidate.decoyDensity,
          pairDistance: candidate.pairDistance,
          addRowHelpfulnessTarget: candidate.addRowHelpfulnessTarget,
          reachableMatchTarget: candidate.reachableMatchTarget,
          diversityTarget: candidate.diversityTarget,
        };
        customDifficultyEngine.getDifficultyProfile = (l: number) => {
          if (l === level) return customProfile;
          return baseProfile;
        };

        const runner = new BotRunner();
        await runner.runBatch("Smart", this.simulationsPerCandidate, [level], undefined, { difficultyEngine: customDifficultyEngine });
        
        const analytics = runner.getAnalytics().getLevelAnalytics(level);
        const metrics = {
          winRate: analytics.completionRate,
          avgAddRows: analytics.averageAddRows,
          avgCompletionTime: analytics.averageCompletionTime,
          criticalStuckRate: analytics.criticalStuckRate,
          oneNumberFailureRate: analytics.oneNumberFailureRate,
          twoNumberFailureRate: analytics.twoNumberFailureRate,
          threeNumberFailureRate: analytics.threeNumberFailureRate,
          rescueModeTriggerCount: analytics.rescueModeTriggerCount,
          rescueSuccessRate: analytics.rescueSuccessRate,
          averageRemainingNumbersAtFailure: analytics.averageRemainingNumbersAtFailure
        };
        
        const fitness = this.calculateFitness(metrics);
        const result = { params: candidate, fitness, metrics };
        
        this.cache.set(hash, result);
        this.stats.uniqueCandidatesEvaluated++;
        results.push(result);
        
        if ((i + 1) % 5 === 0) {
          console.log(`Evaluated ${i + 1}/${population.length} candidates...`);
        }
      }

      results.sort((a, b) => b.fitness - a.fitness);
      const generationBest = results[0];
      
      console.log(`Best Fitness: ${generationBest.fitness.toFixed(2)} | Win Rate: ${(generationBest.metrics.winRate * 100).toFixed(1)}% | Add Rows: ${generationBest.metrics.avgAddRows.toFixed(2)}`);
      
      this.stats.bestFitnessHistory.push(generationBest.fitness);
      const div = this.calculateDiversity(population);
      this.stats.populationDiversity.push(div);
      console.log(`Population Diversity: ${div.toFixed(1)}%`);

      if (!bestOverallCandidate || generationBest.fitness > bestOverallCandidate.fitness) {
        bestOverallCandidate = generationBest;
        convergenceCounter = 0;
      } else {
        convergenceCounter++;
      }
      
      history.push({
        generation,
        bestFitness: generationBest.fitness,
        bestParams: generationBest.params
      });

      this.updateDashboard(generation, generationBest, bestOverallCandidate);

      if (convergenceCounter >= 5) {
        console.log(`Fitness converged after ${generation} generations.`);
        break;
      }

      // Next Generation Construction
      const nextPop: CandidateParams[] = [];
      const seenHashes = new Set<string>();

      // 5 Elites
      const survivors = results.slice(0, 5).map(r => r.params);
      for (const elite of survivors) {
          addUnique(elite, false, nextPop, seenHashes);
      }
      
      // 10 Mutated Children
      while (nextPop.length < 15) {
        const parent = survivors[Math.floor(Math.random() * survivors.length)];
        addUnique(this.mutate(parent), false, nextPop, seenHashes);
      }

      // 5 Random Explorers
      while (nextPop.length < this.populationSize) {
        addUnique(this.generateRandomCandidate(), true, nextPop, seenHashes);
      }

      population = nextPop;
      generation++;
    }

    console.log(`\nTraining loop ended. Validating best candidate with 1000 games...`);
    if (bestOverallCandidate) {
        const finalCandidate = bestOverallCandidate.params;
        const customDifficultyEngine = new DifficultyEngine();
        const baseProfile = customDifficultyEngine.getDifficultyProfile(level);
        const customProfile: DifficultyProfile = {
          ...baseProfile,
          matchDensity: finalCandidate.matchDensity,
          decoyDensity: finalCandidate.decoyDensity,
          pairDistance: finalCandidate.pairDistance,
          addRowHelpfulnessTarget: finalCandidate.addRowHelpfulnessTarget,
          reachableMatchTarget: finalCandidate.reachableMatchTarget,
          diversityTarget: finalCandidate.diversityTarget,
        };
        customDifficultyEngine.getDifficultyProfile = (l: number) => {
          if (l === level) return customProfile;
          return baseProfile;
        };

        const runner = new BotRunner();
        await runner.runBatch("Smart", 1000, [level], undefined, { difficultyEngine: customDifficultyEngine });
        const analytics = runner.getAnalytics().getLevelAnalytics(level);
        const finalMetrics = {
          winRate: analytics.completionRate,
          avgAddRows: analytics.averageAddRows,
          avgCompletionTime: analytics.averageCompletionTime,
          criticalStuckRate: analytics.criticalStuckRate,
          oneNumberFailureRate: analytics.oneNumberFailureRate,
          twoNumberFailureRate: analytics.twoNumberFailureRate,
          threeNumberFailureRate: analytics.threeNumberFailureRate,
          rescueModeTriggerCount: analytics.rescueModeTriggerCount,
          rescueSuccessRate: analytics.rescueSuccessRate,
          averageRemainingNumbersAtFailure: analytics.averageRemainingNumbersAtFailure
        };
        const finalFitness = this.calculateFitness(finalMetrics);
        bestOverallCandidate.metrics = finalMetrics;
        bestOverallCandidate.fitness = finalFitness;
        
        console.log(`Final Validation: Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}% | Add Rows: ${finalMetrics.avgAddRows.toFixed(2)} | Fitness: ${finalFitness.toFixed(2)}`);

        this.generateOutputs(level, bestOverallCandidate, history);
    }
  }

  private updateDashboard(generation: number, currentBest: CandidateResult, overallBest: CandidateResult) {
    console.log(`\n=== DASHBOARD ===`);
    console.log(`Generation: ${generation}`);
    console.log(`Best Overall Win Rate: ${(overallBest.metrics.winRate * 100).toFixed(1)}%`);
    console.log(`Best Overall Fitness Score: ${overallBest.fitness.toFixed(2)}`);
    console.log(`Current Best Configuration:`);
    console.log(JSON.stringify(currentBest.params, null, 2));
    console.log(`=================\n`);
  }

  private generateOutputs(level: number, best: CandidateResult, history: any[]) {
    const reportsDir = path.join(process.cwd(), "reports");
    const publicDir = path.join(process.cwd(), "public");
    
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // 1. training-report.md
    const mdPath = path.join(reportsDir, "training-report.md");
    let mdContent = `# Auto Balance Training Report - Level ${level}\n\n`;
    mdContent += `## Best Metrics (1000 Validated)\n`;
    mdContent += `- Win Rate: ${(best.metrics.winRate * 100).toFixed(2)}%\n`;
    mdContent += `- Average Add Rows: ${best.metrics.avgAddRows.toFixed(2)}\n`;
    mdContent += `- Critical Stuck Rate: ${(best.metrics.criticalStuckRate * 100).toFixed(2)}%\n`;
    mdContent += `- Completion Time: ${best.metrics.avgCompletionTime.toFixed(1)}s\n\n`;

    mdContent += `## Endgame Recovery Metrics\n`;
    mdContent += `- Rescue Mode Trigger Count: ${best.metrics.rescueModeTriggerCount}\n`;
    mdContent += `- Rescue Success Rate: ${(best.metrics.rescueSuccessRate * 100).toFixed(2)}%\n`;
    mdContent += `- Average Remaining Numbers At Failure: ${best.metrics.averageRemainingNumbersAtFailure.toFixed(2)}\n\n`;

    mdContent += `### Failure Distribution\n`;
    const oneNum = (best.metrics.oneNumberFailureRate * 100).toFixed(1);
    const twoNum = (best.metrics.twoNumberFailureRate * 100).toFixed(1);
    const threeNum = (best.metrics.threeNumberFailureRate * 100).toFixed(1);
    const other = (100 - parseFloat(oneNum) - parseFloat(twoNum) - parseFloat(threeNum)).toFixed(1);
    
    mdContent += `- 1 Number Left: ${oneNum}%\n`;
    mdContent += `- 2 Numbers Left: ${twoNum}%\n`;
    mdContent += `- 3 Numbers Left: ${threeNum}%\n`;
    mdContent += `- 4+ Numbers Left (Global Stuck): ${other}%\n\n`;

    mdContent += `## Best Configuration\n\`\`\`json\n${JSON.stringify(best.params, null, 2)}\n\`\`\`\n`;
    fs.writeFileSync(mdPath, mdContent);

    // 2. training-history.json
    const historyPath = path.join(reportsDir, "training-history.json");
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    // 3. game-balance.json
    const gameBalancePath = path.join(publicDir, "game-balance.json");
    let balanceData: Record<string, any> = {};
    if (fs.existsSync(gameBalancePath)) {
      try {
        balanceData = JSON.parse(fs.readFileSync(gameBalancePath, 'utf8'));
      } catch (e) { }
    }
    balanceData[`level${level}`] = best.params;
    fs.writeFileSync(gameBalancePath, JSON.stringify(balanceData, null, 2));

    // 4. training-diagnostics.json
    const diagPath = path.join(reportsDir, "training-diagnostics.json");
    fs.writeFileSync(diagPath, JSON.stringify({
        uniqueCandidatesEvaluated: this.stats.uniqueCandidatesEvaluated,
        clonesRejected: this.stats.clonesRejected,
        mutationCount: this.stats.mutationCount,
        cacheHits: this.stats.cacheHits,
        populationDiversity: this.stats.populationDiversity,
        bestFitnessHistory: this.stats.bestFitnessHistory
    }, null, 2));
    
    console.log(`Reports and diagnostics generated at /reports and /public`);
  }
}
