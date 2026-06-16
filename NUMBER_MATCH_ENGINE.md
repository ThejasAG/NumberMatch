# Number Match Engine

Deterministic game logic for a Number Match Puzzle Game.

## Goal

Replace random number generation with controlled, reproducible difficulty.

Given the same:

- level
- attempt

the same board and generated rows are produced.

Seed formula:

```ts
seed = level * 1000003 + attempt
```

## Modules

### Board Engine

File: `src/boardEngine.ts`

Handles:

- board state
- valid pair detection
- pair removal
- remaining numbers
- win condition
- board height

Rules supported:

- same number match
- sum to 10 match
- horizontal
- vertical
- diagonal
- wrap-around from last cell of row N to first cell of row N+1

Main APIs:

- `generateBoard(level, attempt)`
- `findAllValidPairs()`
- `isValidPair(cellA, cellB)`
- `removePair(cellA, cellB)`
- `getRemainingNumbers()`
- `isBoardEmpty()`
- `getBoardState()`
- `getBoardHeight()`

### Difficulty Engine

File: `src/difficultyEngine.ts`

Handles deterministic difficulty profiles and scoring.

Difficulty variables:

- match density
- decoy density
- pair distance
- chain depth
- target add rows

Sawtooth curve:

- Level 1: Easy
- Level 2: Easy+
- Level 3: Normal
- Level 4: Hard
- Level 5: Hard+
- Level 6: Relief / Normal
- Level 7: Hard
- Level 8: Hard+
- Level 9: Very Hard
- Level 10: Peak

Main APIs:

- `getDifficultyProfile(level)`
- `calculateDifficulty(board)`
- `validateDifficultyRange(board, level)`
- `getTargetAddRows(level)`

Difficulty score range:

```ts
0 - 100
```

### Smart Add Row Engine

File: `src/addRowEngine.ts`

Generates one deterministic row of exactly 9 numbers.

Uses:

- current board
- level
- attempt
- remaining add rows
- difficulty profile
- sparse row cleanup bias

Every generated row contains at least one future match opportunity.

Main APIs:

- `analyzeBoard(board, level)`
- `findMissingComplements(board)`
- `generateAddRow(board, input)`
- `calculateHelpfulness(row, board)`

### Rescue Engine

File: `src/rescueEngine.ts`

Prevents stuck states.

If no matches exist and two add row attempts fail, rescue mode can trigger.

Rescue rows contain guaranteed visible matches.

Main APIs:

- `isStuck(board)`
- `trackFailedAddRows(board)`
- `shouldTriggerRescue(board)`
- `generateRescueRow(level, attempt)`
- `validateRescueSuccess(row)`
- `resetAfterSuccessfulMatch()`

### Straggler Cleanup Engine

File: `src/cleanupEngine.ts`

Finds and prioritizes sparse rows.

Sparse row:

```ts
1 - 3 remaining numbers
```

Main APIs:

- `findSparseRows(board)`
- `calculateRowPriority(board, rowIndex)`
- `generateCleanupTargets(board)`
- `applyCleanupBias(row, board)`

## Tests

File: `tests/engine.test.ts`

Covered:

- deterministic board generation
- match direction detection
- wrap-around matching
- pair removal
- empty board win condition
- smart add row generation
- rescue mode trigger
- rescue row validation
- sawtooth difficulty profile

Run:

```bash
npm test
```

Current result:

```txt
6 pass
0 fail
```

## Entry Point

File: `src/index.ts`

Exports all public modules.

## Phase 2.5 Validation

File: `src/validationFramework.ts`

Adds statistical validation tools only. No new gameplay systems.

Validation modules:

- Mass board validation
- Difficulty distribution validation
- Add row usage validation
- Completion rate validation
- Sawtooth validation
- Final calibration report generator

Main APIs:

- `validateBoards(levels, count, tolerance)`
- `validateDifficultyDistribution(levels, count)`
- `validateAddRowUsage(levels, count)`
- `validateCompletionRates(levels, count, requiredRate)`
- `validateSawtooth(count)`
- `generateCalibrationReport(options)`
- `exportJson(report)`
- `exportCsv(report)`
- `exportMarkdown(report)`

Default validation counts match the Phase 2.5 spec:

- board validation: 10000
- difficulty distribution: 1000
- simulation validation: 10000

Tests now include the Validation Suite.

Current test result:

```txt
21 pass
0 fail
```
