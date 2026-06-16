import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.tsx";
import { useGameStore } from "../store/gameStore.ts";

export function HomeScreen() {
  const lastLevel = useGameStore((state) => state.lastLevel);

  return (
    <AppShell title="Number Match">
      <section className="home-panel">
        <div className="brand-mark">10</div>
        <Link className="primary-action" to={`/game/${lastLevel}`}>Play</Link>
        <Link className="secondary-action" to="/levels">Levels</Link>
      </section>
    </AppShell>
  );
}
