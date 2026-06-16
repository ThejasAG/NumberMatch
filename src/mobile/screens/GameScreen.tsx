import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.tsx";
import { BoardGrid } from "../components/BoardGrid.tsx";
import { usePulse } from "../animation/usePulse.ts";
import { useGameStore } from "../store/gameStore.ts";
import { DebugPanel } from "../components/DebugPanel.tsx";
import { useDebugStore } from "../../debug/debugStore.ts";

export function GameScreen() {
  const params = useParams();
  const navigate = useNavigate();
  const paramsLevel = Number(params.level ?? 1);
  const { pulseKey, pulse } = usePulse();
  const storeLevel = useGameStore((state) => state.level);
  const board = useGameStore((state) => state.board);
  const selected = useGameStore((state) => state.selected);
  const status = useGameStore((state) => state.status);
  const message = useGameStore((state) => state.message);
  const addRowsUsed = useGameStore((state) => state.addRowsUsed);
  const remainingAddRows = useGameStore((state) => state.remainingAddRows);
  const startLevel = useGameStore((state) => state.startLevel);
  const selectCell = useGameStore((state) => state.selectCell);
  const addRow = useGameStore((state) => state.addRow);
  const useHint = useGameStore((state) => state.useHint);
  const activeHint = useGameStore((state) => state.activeHint);
  const hintsRemaining = useGameStore((state) => state.hintsRemaining);
  const hintSuggestHighlight = useGameStore((state) => state.hintSuggestHighlight);
  const score = useGameStore((state) => state.score);
  const bestScores = useGameStore((state) => state.bestScores);
  const debugMode = useDebugStore((state) => state.debugMode);
  const toggleDebugMode = useDebugStore((state) => state.toggleDebugMode);

  const bestScore = bestScores?.[storeLevel] || 0;

  useEffect(() => {
    if (storeLevel !== paramsLevel || board.length === 0) {
      startLevel(paramsLevel);
    }
  }, [paramsLevel, storeLevel, startLevel, board.length]);

  useEffect(() => {
    if (storeLevel !== paramsLevel) return;
    if (status === "won") navigate(`/win/${storeLevel}`, { replace: true });
    if (status === "lost") navigate(`/lose/${storeLevel}`, { replace: true });
  }, [storeLevel, paramsLevel, navigate, status]);

  useEffect(() => {
    if (!activeHint) return;
    const timer = setTimeout(() => {
      useGameStore.setState({ activeHint: null });
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeHint]);

  if (storeLevel !== paramsLevel || board.length === 0) return null;

  return (
    <AppShell title={`Stage ${storeLevel}`} backTo="/levels">
      <section className="hud">
        <div className="score-card">
          <div className="score-label">⭐ Score</div>
          <div className="score-value">{score}</div>
        </div>
        <div className="score-card">
          <div className="score-label">👑 Best</div>
          <div className="score-value">{bestScore}</div>
        </div>
      </section>
      <div className={pulseKey ? "pulse-zone pulse" : "pulse-zone"}>
        <BoardGrid board={board} selected={selected} activeHint={activeHint} onSelect={(cell) => {
          selectCell(cell);
          pulse();
        }} />
      </div>
      <footer className="game-actions-row">
        <button className="action-circle add-row" disabled={remainingAddRows <= 0} onClick={() => {
          addRow();
          pulse();
        }} type="button">
          +
          <span className="badge">{remainingAddRows}</span>
        </button>
        <button className={`action-circle hint ${hintSuggestHighlight ? 'suggest-pulse' : ''}`} type="button" disabled={hintsRemaining <= 0} onClick={() => {
          useHint();
          pulse();
        }}>
          💡
          <span className="badge">{hintsRemaining}</span>
        </button>
      </footer>
      {debugMode && <DebugPanel />}
    </AppShell>
  );
}
