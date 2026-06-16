import { AppShell } from "../components/AppShell.tsx";
import { LevelButton } from "../components/LevelButton.tsx";
import { useGameStore } from "../store/gameStore.ts";

export function LevelSelectScreen() {
  const unlockedLevel = useGameStore((state) => state.unlockedLevel);

  return (
    <AppShell title="Levels" backTo="/">
      <section className="level-grid" aria-label="Level selection">
        {Array.from({ length: 30 }, (_, index) => {
          const level = index + 1;
          return <LevelButton key={level} level={level} unlocked={level <= unlockedLevel} />;
        })}
      </section>
    </AppShell>
  );
}
