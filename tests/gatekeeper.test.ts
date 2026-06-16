import { describe, it } from "node:test";
import assert from "node:assert";
import { useGameStore } from "../src/mobile/store/gameStore.ts";
import { soundManager } from "../src/mobile/sound/SoundManager.ts";

// Mock sound manager for node tests
soundManager.play = () => {};
soundManager.setEnabled = () => {};

describe("Add Row Gatekeeper Logic", () => {
  it("blocks Add Row when valid moves exist", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);

    // Initial level 1 board has valid moves
    store.addRow();

    const state = useGameStore.getState();
    assert.strictEqual(state.message, "Valid matches still exist. Clear existing moves first.");
    assert.ok(state.lastAddRowBlockedAt > 0);
    assert.strictEqual(state.hintSuggestHighlight, true);
  });

  it("allows Add Row when no valid moves exist", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);

    const session = useGameStore.getState().session!;
    
    // Stub valid pairs to return empty
    session.getValidPairs = () => [];

    const previousAddRowsUsed = useGameStore.getState().addRowsUsed;
    store.addRow();

    const state = useGameStore.getState();
    assert.strictEqual(state.addRowsUsed, previousAddRowsUsed + 1);
    assert.strictEqual(state.lastAddRowBlockedAt, 0);
  });

  it("allows Add Row when exactly one number remains", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);

    const session = useGameStore.getState().session!;
    
    // Stub valid pairs to return something, BUT stub remaining numbers to 1
    session.getValidPairs = () => [{ a: { row: 0, col: 0 }, b: { row: 0, col: 1 } }];
    const engine = session.getBoardEngine();
    engine.getRemainingNumbers = () => [5]; // Only 1 number remains

    const previousAddRowsUsed = useGameStore.getState().addRowsUsed;
    store.addRow();

    const state = useGameStore.getState();
    assert.strictEqual(state.addRowsUsed, previousAddRowsUsed + 1);
    assert.strictEqual(state.lastAddRowBlockedAt, 0);
  });

  it("bypasses block if 3 seconds have passed since last block", async () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);

    // Mock Date.now to control time
    const originalDateNow = Date.now;
    let mockTime = 10000;
    Date.now = () => mockTime;

    try {
        // First addRow attempt -> Blocked
        store.addRow();
        
        let state = useGameStore.getState();
        assert.strictEqual(state.lastAddRowBlockedAt, 10000);
        const previousAddRowsUsed = state.addRowsUsed;

        // Advance time by 2 seconds -> Still Blocked
        mockTime = 12000;
        store.addRow();
        state = useGameStore.getState();
        assert.strictEqual(state.lastAddRowBlockedAt, 12000);
        assert.strictEqual(state.addRowsUsed, previousAddRowsUsed);

        // Advance time by 3 seconds from the LAST block -> Bypass Allowed
        mockTime = 15000;
        store.addRow();
        state = useGameStore.getState();
        
        // It should have allowed the Add Row and reset the blocked timestamp
        assert.strictEqual(state.lastAddRowBlockedAt, 0);
        assert.strictEqual(state.addRowsUsed, previousAddRowsUsed + 1);

    } finally {
        Date.now = originalDateNow;
    }
  });

  it("resets gatekeeper bypass upon successful match", () => {
    const store = useGameStore.getState();
    store.resetProgress();
    store.startLevel(1);

    // Mock Date.now
    const originalDateNow = Date.now;
    let mockTime = 10000;
    Date.now = () => mockTime;

    try {
        // First addRow attempt -> Blocked
        store.addRow();
        
        let state = useGameStore.getState();
        assert.strictEqual(state.lastAddRowBlockedAt, 10000);

        // Advance time by 3 seconds, meaning bypass is ready
        mockTime = 13000;

        // But user makes a successful match
        const validPairs = state.session!.getValidPairs();
        const pair = validPairs[0];
        
        // Select cell A and B
        store.selectCell(pair.a);
        store.selectCell(pair.b);

        state = useGameStore.getState();
        // Ensure successful match cleared the bypass timer
        assert.strictEqual(state.lastAddRowBlockedAt, 0);

        // Now if they try to Add Row, it will be blocked fresh
        store.addRow();
        state = useGameStore.getState();
        assert.strictEqual(state.lastAddRowBlockedAt, 13000); // fresh block
    } finally {
        Date.now = originalDateNow;
    }
  });
});
