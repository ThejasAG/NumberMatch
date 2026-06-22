export type CellValue = number | null;

export interface Cell {
  row: number;
  col: number;
}

export interface Pair {
  a: Cell;
  b: Cell;
}

export type PathType = "horizontal" | "vertical" | "diagonal" | "wrap" | "none";

export interface MatchDebugInfo {
  cellA: Cell;
  cellB: Cell;
  pathType: PathType;
  blockers: Cell[];
  valuesMatch: boolean;
  pathClear: boolean;
  matchResult: boolean;
}

export interface DifficultyProfile {
  level: number;
  name: string;
  matchDensity: number;
  decoyDensity: number;
  pairDistance: "low" | "medium" | "high";
  chainDepth: number;
  targetAddRows: [number, number];
  helperRatio: number;
  setupRatio: number;
  decoyRatio: number;
  scoreRange: [number, number];
  addRowHelpfulnessTarget?: number;
  reachableMatchTarget?: number;
  diversityTarget?: number;
  validation?: LevelValidationRules;
}

export interface LevelValidationRules {
  targetAddRows: number;
  minReachablePairs: number;
  minDigitDiversity: number;
  minSolutionBranches: number;
  maxDeadlocks: number;
  targetWinRate: number;
  maxAddRowDependencyScore?: number;
}

export interface BoardAnalysis {
  remainingNumbers: number[];
  existingMatches: Pair[];
  missingComplements: Map<number, number>;
  sparseRows: number[];
  difficultyScore: number;
}

export interface AddRowInput {
  level: number;
  attempt: number;
  remainingAddRows: number;
  forceInstantMatch?: boolean;
}

export interface SolutionPairNode {
  id: string;
  values: [number, number];
  unlockAfter: string[];
  route: number;
}

export interface SolutionGraph {
  level: number;
  seed: number;
  totalPairs: number;
  branchingFactor: number;
  chainDepth: number;
  hiddenPairCount: number;
  directPairCount: number;
  nodes: SolutionPairNode[];
}

export interface LevelData {
  level: number;
  attempt: number;
  seed: number;
  graph: SolutionGraph;
  board: CellValue[][];
  difficultyScore: number;
  matchDensity: number;
  decoyDensity: number;
  pairDistance: number;
  analytics: LevelBoardAnalytics;
}

export interface LevelBoardAnalytics {
  initialReachablePairs: number;
  solutionGraphBranchingFactor: number;
  deadlockFrequency: number;
  addRowDependencyScore: number;
  boardDiversityScore: number;
}

export type BotType = "perfect" | "average" | "weak";

export interface SimulationResult {
  level: number;
  bot: BotType;
  won: boolean;
  moves: number;
  addRowsUsed: number;
  rescueActivations: number;
  maxBoardHeight: number;
  completionTime: number;
  orphanDigitCount: number;
  boardAnalytics?: LevelBoardAnalytics;
}

export interface SimulationReport {
  level: number;
  count: number;
  results: SimulationResult[];
  wins: number;
  losses: number;
  completionRate: number;
  averageAddRowsUsed: number;
  averageBoardHeight: number;
  rescueActivations: number;
  averageCompletionTime: number;
  averageOrphanDigitCount: number;
  averageReachablePairs: number;
  averageDiversityScore: number;
  averageBranchingFactor: number;
  averageDeadlockFrequency: number;
  averageAddRowDependency: number;
  rescueTriggerRate: number;
}

export interface AnalyticsReport {
  sessions: number;
  completionRate: number;
  averageCompletionTime: number;
  averageMoves: number;
  averageAddRowsUsed: number;
  averageBoardHeight: number;
  averageRescueActivations: number;
  averageMatchDensity: number;
  averageInitialReachablePairs: number;
  averageSolutionGraphBranchingFactor: number;
  averageDeadlockFrequency: number;
  averageAddRowDependencyScore: number;
  averageBoardDiversityScore: number;
  difficultyDistribution: Record<string, number>;
}

export interface TuningReport {
  level: number;
  iterations: number;
  converged: boolean;
  adjustments: Partial<DifficultyProfile>;
  finalCompletionRate: number;
  finalAverageAddRows: number;
}

export interface BoardValidationLevelReport {
  level: number;
  generated: number;
  solvable: number;
  deterministic: number;
  failed: number;
  difficultyMean: number;
  difficultyStdDev: number;
  addRowBudgetRespected: number;
}

export interface BoardValidationReport {
  levels: BoardValidationLevelReport[];
  passed: boolean;
}

export interface DifficultyStats {
  level: number;
  mean: number;
  median: number;
  stdDev: number;
}

export interface DifficultyDistributionReport {
  stats: DifficultyStats[];
  level10GreaterThan9GreaterThan8: boolean;
  level6EasierThan5: boolean;
  level11EasierThan10: boolean;
  passed: boolean;
}

export interface AddRowValidationLevelReport {
  level: number;
  simulations: number;
  averageAddRowsUsed: number;
  targetRange: [number, number];
  passed: boolean;
}

export interface AddRowValidationReport {
  levels: AddRowValidationLevelReport[];
  passed: boolean;
}

export interface CompletionValidationLevelReport {
  level: number;
  simulations: number;
  completionRate: number;
  requiredRate: number;
  passed: boolean;
}

export interface CompletionValidationReport {
  levels: CompletionValidationLevelReport[];
  passed: boolean;
}

export interface SawtoothReport {
  firstRamp: boolean;
  firstDrop: boolean;
  secondRamp: boolean;
  secondDrop: boolean;
  passed: boolean;
  means: Record<string, number>;
}

export interface FinalCalibrationReport {
  boardValidation: BoardValidationReport;
  difficultyDistribution: DifficultyDistributionReport;
  addRowUsage: AddRowValidationReport;
  completionRate: CompletionValidationReport;
  sawtooth: SawtoothReport;
  levelMetrics: SimulationReport[];
  passed: boolean;
}
