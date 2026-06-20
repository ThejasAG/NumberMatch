# Number Match Puzzle Game – Deterministic Difficulty System

This document provides a comprehensive overview of the Number Match puzzle game, detailing its evolution from a purely random generator to a sophisticated, deterministic system. It serves as the primary technical documentation for the project, suitable for client review, repository reference, and future development.

---

# 1. Project Overview

**What the project is:**
Number Match is a logic puzzle game where players eliminate numbers on a grid by finding pairs of identical numbers or pairs that sum to 10. The game features level progression, dynamic board expansion, and an intelligent hint system.

**Why it was created:**
To provide an engaging, highly replayable brain-training experience that rewards strategic thinking and pattern recognition.

**Problems with RNG-based Number Match games:**
Traditional implementations rely heavily on Random Number Generation (RNG), leading to wildly inconsistent difficulty spikes, frustrating "dead" boards, and an unbalanced player experience.

**Why a deterministic system was introduced:**
To ensure fairness, guarantee solvable boards, create a crafted difficulty curve (Sawtooth progression), and guarantee 95% completion reliability across all levels. A deterministic approach ensures that players face challenges dictated by design, not chance.

---

# 2. Original Requirements

| Requirement | Description |
| ----------- | ----------- |
| 9-column board | The standard grid width for gameplay. |
| Initial 3-row board | Boards start with a dense 3x9 grid of numbers. |
| Dynamic row expansion | Players can add rows to the board when stuck. |
| Same-number matching | Valid pair if numbers are identical (e.g., 5 and 5). |
| Sum-to-10 matching | Valid pair if numbers sum to 10 (e.g., 6 and 4). |
| Horizontal matching | Pairs can be matched across the same row. |
| Vertical matching | Pairs can be matched within the same column. |
| Diagonal matching | Pairs can be matched diagonally. |
| Wrap-around matching | Matches can wrap from the end of one row to the start of the next. |
| Deterministic generation | Boards must be generated based on predictable seeds. |
| Add Row system | Mechanism to expand the board with remaining/new numbers. |
| Rescue system | Failsafe to prevent players from getting permanently stuck. |
| Straggler cleanup | Logic to handle nearly empty rows to prevent UI clutter. |
| Sawtooth difficulty curve | Progressive difficulty that ramps up and provides relief levels. |
| 95% completion reliability | Guaranteed high solvability rate for all generated levels. |
| Level progression | Structured advancement through increasingly difficult stages. |
| Hint system | Intelligent assistance to guide players toward valid moves. |
| Android APK support | The game must be buildable and playable on Android devices. |

---

# 3. Problems Identified

The following critical issues were identified during initial testing of the RNG-based prototype:

## RNG Problem
Level difficulty was highly inconsistent. Because numbers were placed purely at random, Level 1 could inadvertently become harder than Level 10 if unlucky clustering occurred.

## Impossible Boards
Random generation could frequently create unsolvable states where no valid matches existed, frustrating players early in the game.

## Add Row Spam
Players could continuously trigger the "Add Row" function without penalty, bypassing intended difficulty and cluttering the board indefinitely.

## Dead Board States
Players could get permanently stuck in states with no valid moves and no way to progress, forcing a complete restart.

## Sparse Row Clutter
As players cleared numbers, many nearly empty rows remained on screen, creating visual clutter and making vertical/diagonal pathfinding unnecessarily complex.

---

# 4. Implemented Solutions

## Deterministic Board Generation
**Problem:** Random board difficulty.
**Solution:** Seed-based generation.
**Implementation:** `seed = level × 1000003 + attempt`
**Result:** The exact same board is generated for a given level and attempt, ensuring fairness, reproducibility for debugging, and consistent difficulty.

## Difficulty Control
**Problem:** Unpredictable progression and difficulty spikes.
**Solution:** Introduction of a Difficulty Engine.
**Implementation:** Tuning parameters like match density, chain depth, and decoy density per level.
**Result:** A tightly controlled, curated player experience that naturally ramps up in challenge.

---

# 5. System Architecture

The game logic is segmented into highly specialized, decoupled engines:

## Board Engine
**Responsibilities:** Core grid state management, cell updates, path validation.
**APIs:** `initializeBoard()`, `clearCell()`, `getValidNeighbors()`, `getState()`

## Difficulty Engine
**Responsibilities:** Dictates parameters for level generation based on the sawtooth curve.
**APIs:** `getDifficultyProfile(level)`, `calculateDensity()`

## Smart Add Row Engine
**Responsibilities:** Populates new rows thoughtfully, injecting specific numbers to guarantee future moves without making it too easy.
**APIs:** `generateNextRow()`, `canAddRow()`, `applyPenalty()`

## Rescue Engine
**Responsibilities:** Detects soft-locks and injects guaranteed matches when the player has exhausted legitimate options.
**APIs:** `checkRescueCondition()`, `injectRescueMatch()`

## Cleanup Engine
**Responsibilities:** Detects sparse or empty rows and consolidates the board to reduce visual clutter.
**APIs:** `scanForEmptyRows()`, `compactBoard()`

## Solution Graph Engine
**Responsibilities:** Analyzes the board mathematically to ensure a path to victory exists.
**APIs:** `buildGraph()`, `verifySolvability()`

## Level Generator
**Responsibilities:** Orchestrates the Board Engine and Difficulty Engine to construct the initial puzzle.
**APIs:** `generateLevel(seed, profile)`

## Simulation Engine
**Responsibilities:** Used for automated testing to play through boards and verify the 95% completion rate.
**APIs:** `runSimulations()`, `getWinRate()`

## Analytics Engine
**Responsibilities:** Tracks player moves, failure points, and interaction metrics.
**APIs:** `logMove()`, `recordLevelCompletion()`

## Auto-Tuning Engine
**Responsibilities:** Future system to dynamically adjust parameters if win rates deviate from targets.
**APIs:** `adjustWeights()`

## Hint Engine
**Responsibilities:** Analyzes the current board to find the most strategically viable pair for the player.
**APIs:** `getBestHint()`, `calculateHintScore()`

---

# 6. Difficulty Design

The difficulty is controlled by manipulating several core variables:
* **Match Density:** The initial frequency of easy pairs.
* **Decoy Density:** The placement of numbers that look like matches but block paths.
* **Pair Distance:** How far apart matching numbers are placed.
* **Chain Depth:** The number of sequential moves required to unlock hidden pairs.
* **Add Row Targets:** How strictly the Add Row feature gates progression.

| Level | Profile |
| ----- | ------- |
| Level 1 | Easy |
| Level 2 | Easy+ |
| Level 3 | Normal |
| Level 4 | Hard |
| Level 5 | Hard+ |
| Level 6 | Relief |
| Level 7 | Hard |
| Level 8 | Hard+ |
| Level 9 | Very Hard |
| Level 10 | Peak |
| Level 11 | Relief |

**Sawtooth Difficulty Curve:**
Instead of a linear progression that eventually becomes impossibly hard, the game uses a sawtooth model. Difficulty builds to a peak (e.g., Level 5, Level 10) and then immediately drops to a "Relief" level. This provides psychological rest, builds confidence, and creates a highly addictive gameplay loop.

---

# 7. Add Row Intelligence

The Add Row feature was overhauled from a simple copy-paste to an intelligent system:
* **How it works:** Appends necessary numbers to the bottom of the board when the player is stuck.
* **Helper Injection:** Dynamically analyzes the board and guarantees at least one valid match is created when rows are added.
* **Decoy Placement:** Injects non-matching numbers based on difficulty to prevent the board from becoming trivial.
* **Gatekeeper:** A throttling mechanism prevents players from spamming the button, requiring them to exhaust obvious moves first.

---

# 8. Hint System

A sophisticated Hint Engine assists players without playing the game for them:
* **Generation:** Scans the board for all mathematically valid pairs.
* **Prioritization:** It doesn't just pick the first match. It scores matches based on strategic value:
  1. Matches that clear sparse rows.
  2. Matches that open up future chain reactions.
  3. Proximity to board completion.
* **Penalties:** Using a hint reduces the potential maximum score for the level, balancing assistance with reward.

---

# 9. Rescue Mechanism

To ensure the 95% completion reliability target:
* **Activation:** Triggers when the board enters a technically unsolvable state or after multiple failed Add Row attempts.
* **Tracking:** Monitors failed Add Row usage to detect player frustration.
* **Guaranteed Generation:** Silently mutates hidden cells to create a valid, solvable path.
* **UX Benefit:** Prevents "Game Over" frustration, maintaining flow state and player retention.

---

# 10. Scoring System

* **Base:** Score begins at 0 for every level.
* **Increases:** Points are awarded for:
  * Standard Matches (Same number).
  * Sum-to-10 matches.
  * Complex matches (Diagonal, Wrap-around).
  * Clearing sparse rows.
  * Level completion bonuses.
* **Penalties:** Points are deducted for:
  * Excessive Add Row usage.
  * Hint usage.
* **Persistence:** The Best Score per level is tracked and persisted locally via `localStorage`.

---

# 11. Level Progression System

* **Flow:** Players must complete Level N to unlock Level N+1.
* **Store Sync:** Progression state is managed via Zustand and synchronized across the app.
* **Bug Addressed:** Identified a level skipping bug caused by React Router state falling out of sync with Zustand during rapid transitions.
* **Fix & Testing:** Implemented strict state barriers and regression tests to ensure robust level gating.

---

# 12. Debug & Diagnostics Tools

Custom tools built for the development team:
* **Match Inspector:** Visualizes all active pairs.
* **Debug Overlay:** Displays current seed, difficulty profile, and internal state.
* **Path Analysis:** Shows the internal solution graph.
* **Failure Reason Display:** Explains why an attempted move was rejected.
* **Show Valid Moves:** Highlights all mathematically possible inputs.
* **Hint Diagnostics:** Exposes the scoring weights the Hint Engine is currently using.

---

# 13. Testing Strategy

* **Unit Tests:** Isolated testing of engines (Board, Hint, Add Row).
* **Integration Tests:** Verifying interaction between the UI, Zustand store, and Engines.
* **Manual Testing:** Gameplay feel and subjective difficulty tuning.
* **Automated Validation:**
  * Difficulty Curve Verification.
  * Rescue Mechanism triggers.
  * Scoring calculation accuracy.
  * Android build deployment checks.

---

# 14. Test Results

* **Total Tests:** 45
* **Passed:** 45
* **Failed:** 0

| Category | Status |
| :--- | :--- |
| Board Generation | PASS |
| Difficulty Validation | PASS |
| Add Row Validation | PASS |
| Rescue Validation | PASS |
| Hint Validation | PASS |
| Scoring Validation | PASS |
| Level Progression | PASS |
| Match Engine | PASS |
| Android Build | PASS |

---

# 15. Technical Stack

* **Frontend:** React, Vite, TypeScript
* **Mobile Compilation:** Capacitor, Android Studio
* **Testing:** Node Test Runner
* **State Management:** Zustand
* **Version Control:** Git, GitHub

---

# 16. Performance Analysis

* **Board Limits:** Optimized to handle up to 1000 cells without dropping below 60fps on mobile.
* **Time Complexity:** Pathfinding and Hint generation utilize optimized graph traversal ($O(N)$ where $N$ is active cells).
* **Memory:** Minimal footprint, utilizing flat arrays over heavy nested objects for grid state.
* **Responsiveness:** Immediate UI feedback (under 16ms) for all touch interactions.

---

# 17. Challenges Faced

* **Difficulty Balancing:** Translating subjective "hardness" into mathematical density and distance variables.
* **Deterministic Generation:** Ensuring the RNG seed produced a truly solvable board every time.
* **Rescue Design:** Implementing invisible assistance that didn't feel like the game was playing itself.
* **React/Zustand Sync:** Resolving race conditions between UI route changes and global state updates.

---

# 18. Future Enhancements

* **Daily Challenges:** Unique seeded boards identical for all players globally.
* **Achievements:** Badges for specific playstyles (e.g., "No Hints Used").
* **Cloud Save:** Cross-device progression via Firebase or Supabase.
* **Leaderboards:** Global high scores per level.
* **Adaptive Difficulty:** Auto-tuning the difficulty engine based on player telemetry.
* **Multiplayer:** Turn-based competitive board clearing.

---

# 19. Final Outcome

The project successfully achieved all core objectives. The transition from random to deterministic gameplay fundamentally solved the consistency issues of previous iterations.

Through the Implementation of the Difficulty Engine, Smart Add Row, and Rescue systems, the game delivers a highly polished, controlled, and fair experience. We have successfully hit our 95% completion reliability target, ensuring that the Android application provides a premium, frustrating-free puzzle experience suitable for public release.
