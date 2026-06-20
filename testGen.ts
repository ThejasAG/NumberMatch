import { LevelGenerator } from "./src/levelGenerator.ts";
import { BoardEngine } from "./src/boardEngine.ts";
import { deterministicSeed, SeededSequence } from "./src/seeded.ts";

const gen = new LevelGenerator();

// Let's manually run the generation for attempt 1 and print analytics
const level = 2;
const profile = gen['difficulty'].getDifficultyProfile(level);
const seed = deterministicSeed(level, 1);
const rng = new SeededSequence(seed);
const graph = gen['graphGenerator'].generateSolutionGraph(level, seed);

const board = profile.validation
  ? gen['buildLevelOneBoard'](graph, rng)
  : gen['buildDefaultBoard'](graph, rng);

const engine = new BoardEngine(board);
const analytics = gen.calculateBoardAnalytics(engine, graph);

console.log("Profile Validation Rules:", profile.validation);
console.log("Generated Analytics:", analytics);
