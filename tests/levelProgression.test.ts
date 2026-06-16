import { describe, it } from "node:test";
import assert from "node:assert";
import { useGameStore } from "../src/mobile/store/gameStore.ts";

describe("Level Progression Regression Tests", () => {
  it("should increment level 1 to 2 correctly", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    
    // Start Level 1
    store.startLevel(1);
    assert.strictEqual(useGameStore.getState().level, 1);
    
    // Complete Level 1
    store.completeLevel();
    assert.strictEqual(useGameStore.getState().unlockedLevel, 2);
    assert.strictEqual(useGameStore.getState().lastLevel, 2);
  });

  it("should increment level 2 to 3 correctly", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);
    store.completeLevel();
    
    // Start Level 2
    store.startLevel(2);
    assert.strictEqual(useGameStore.getState().level, 2);
    
    // Complete Level 2
    store.completeLevel();
    assert.strictEqual(useGameStore.getState().unlockedLevel, 3);
    assert.strictEqual(useGameStore.getState().lastLevel, 3);
  });

  it("should increment level 5 to 6 correctly", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    
    // Simulate getting to level 5
    store.startLevel(5);
    store.completeLevel();
    assert.strictEqual(useGameStore.getState().unlockedLevel, 6);
    assert.strictEqual(useGameStore.getState().lastLevel, 6);
  });

  it("should increment level 9 to 10 correctly", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    
    store.startLevel(9);
    store.completeLevel();
    assert.strictEqual(useGameStore.getState().unlockedLevel, 10);
    assert.strictEqual(useGameStore.getState().lastLevel, 10);
  });
  
  it("should not skip levels if status is won when starting next level", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    
    // Simulate the exact race condition context
    store.startLevel(1);
    
    // Win level 1
    useGameStore.setState({ status: "won" });
    
    // The GameScreen navigate happens, WinScreen calls completeLevel
    store.completeLevel();
    assert.strictEqual(useGameStore.getState().unlockedLevel, 2);
    
    // GameScreen for level 2 mounts and calls startLevel(2)
    store.startLevel(2);
    
    // At this point, the status should be reset to playing by startLevel
    // This proves the store state itself is robust, and the bug was purely in the React component layer
    assert.strictEqual(useGameStore.getState().status, "playing");
    assert.strictEqual(useGameStore.getState().level, 2);
  });
});
