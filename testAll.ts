import { LevelGenerator } from "./src/levelGenerator.ts";
const gen = new LevelGenerator();

for(let i=1; i<=10; i++) { 
  try { 
    gen.generateLevel(i); 
    console.log("Level", i, "Success"); 
  } catch(e) { 
    console.error("Level", i, "Failed"); 
  } 
}
