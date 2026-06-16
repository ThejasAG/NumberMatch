import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "../components/AppShell.tsx";
import { useGameStore } from "../store/gameStore.ts";

export function WinScreen() {
  const level = Number(useParams().level ?? 1);
  const completeLevel = useGameStore((state) => state.completeLevel);
  const score = useGameStore((state) => state.score);
  const bestScores = useGameStore((state) => state.bestScores);
  const addRowsUsed = useGameStore((state) => state.addRowsUsed);
  const hintsUsed = useGameStore((state) => state.hintsUsed);

  useEffect(() => {
    completeLevel();
  }, [completeLevel]);

  const bestScore = bestScores[level] || 0;

  let efficiency = "C";
  if (addRowsUsed === 0 && hintsUsed === 0) efficiency = "S";
  else if (addRowsUsed <= 1 && hintsUsed <= 1) efficiency = "A";
  else if (addRowsUsed <= 3 && hintsUsed <= 3) efficiency = "B";

  const efficiencyClass = efficiency.toLowerCase();

  return (
    <AppShell title="Level Cleared!" backTo="/levels">
      <section className="result-panel">
        <div className="result-number">{level}</div>
        
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">Score</span>
            <span className="stat-value highlight">{score}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Best</span>
            <span className="stat-value">{bestScore}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Add Rows</span>
            <span className="stat-value">{addRowsUsed}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Hints</span>
            <span className="stat-value">{hintsUsed}</span>
          </div>
        </div>

        <div className="efficiency-container">
            <div className="efficiency-label">Efficiency Rating</div>
            <div className={`efficiency-badge rank-${efficiencyClass}`}>{efficiency}</div>
        </div>

        <div className="action-row">
          <Link className="secondary-action" to="/levels" style={{ flex: 1 }}>Levels</Link>
          <Link className="primary-action" to={`/game/${level + 1}`} style={{ flex: 2 }}>Next Stage</Link>
        </div>
      </section>
    </AppShell>
  );
}
