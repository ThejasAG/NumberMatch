import type { Cell, CellValue } from "../../models.ts";
import { useDebugStore } from "../../debug/debugStore.ts";
import { useGameStore } from "../store/gameStore.ts";

interface BoardGridProps {
  board: CellValue[][];
  selected: Cell | null;
  onSelect: (cell: Cell) => void;
}

export function BoardGrid({ board, selected, onSelect }: BoardGridProps) {
  const debugMode = useDebugStore((state) => state.debugMode);
  const showAllValidMoves = useDebugStore((state) => state.showAllValidMoves);
  const history = useDebugStore((state) => state.history);
  const session = useGameStore((state) => state.session);
  const activeHint = useGameStore((state) => state.activeHint);

  const latest = history.length > 0 ? history[0] : null;
  const validPairs = debugMode && showAllValidMoves && session ? session.getValidPairs() : [];
  
  const isCellInPairs = (r: number, c: number) => {
    return validPairs.some(p => (p.a.row === r && p.a.col === c) || (p.b.row === r && p.b.col === c));
  };

  if (!board || board.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Initializing board...</div>;
  }

  return (
    <section className="board-wrap" aria-label="Number board">
      <div className="board-grid">
        {board.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const isSelected = selected?.row === rowIndex && selected.col === colIndex;
            const isHint = activeHint && ((activeHint.pair.a.row === rowIndex && activeHint.pair.a.col === colIndex) || (activeHint.pair.b.row === rowIndex && activeHint.pair.b.col === colIndex));
            
            let debugClass = "";
            if (debugMode) {
              if (latest) {
                const isBlocker = latest.blockers.some(b => b.row === rowIndex && b.col === colIndex);
                const isPath = latest.intermediateCells.some(p => p.row === rowIndex && p.col === colIndex);
                if (isBlocker && !latest.pathClear) debugClass += " debug-blocker";
                if (isPath && latest.pathClear) debugClass += " debug-path-valid";
              }
              if (showAllValidMoves && isCellInPairs(rowIndex, colIndex)) {
                debugClass += " debug-all-valid-moves";
              }
            }

            const engine = session?.getBoardEngine();
            const originalValue = engine ? engine.getOriginalValue({ row: rowIndex, col: colIndex }) : null;
            const displayValue = value ?? originalValue;

            return (
              <button
                className={`cell ${value === null ? "dimmed" : ""} ${isSelected ? "selected" : ""} ${isHint ? "hint-pulse" : ""}${debugClass}`}
                disabled={value === null}
                key={`${rowIndex}-${colIndex}`}
                onClick={() => onSelect({ row: rowIndex, col: colIndex })}
                type="button"
              >
                {displayValue !== null && displayValue !== 0 ? displayValue : ""}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
