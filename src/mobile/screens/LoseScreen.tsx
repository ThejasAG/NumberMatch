import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell.tsx";

export function LoseScreen() {
  const level = Number(useParams().level ?? 1);

  return (
    <AppShell title="No Moves" backTo="/levels">
      <section className="result-panel">
        <div className="result-number">0</div>
        <Link className="primary-action" to={`/game/${level}`}>Retry</Link>
        <Link className="secondary-action" to="/levels">Levels</Link>
      </section>
    </AppShell>
  );
}
