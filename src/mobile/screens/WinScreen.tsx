import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "../components/AppShell.tsx";
import { useGameStore } from "../store/gameStore.ts";

export function WinScreen() {
  const level = Number(useParams().level ?? 1);
  const completeLevel = useGameStore((state) => state.completeLevel);

  useEffect(() => {
    completeLevel();
  }, [completeLevel]);

  return (
    <AppShell title="Clear" backTo="/levels">
      <section className="result-panel">
        <div className="result-number">{level}</div>
        <Link className="primary-action" to={`/game/${level + 1}`}>Next</Link>
        <Link className="secondary-action" to="/levels">Levels</Link>
      </section>
    </AppShell>
  );
}
