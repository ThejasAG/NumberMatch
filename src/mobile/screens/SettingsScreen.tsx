import { AppShell } from "../components/AppShell.tsx";
import { useGameStore } from "../store/gameStore.ts";

export function SettingsScreen() {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const setSoundEnabled = useGameStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = useGameStore((state) => state.setHapticsEnabled);
  const resetProgress = useGameStore((state) => state.resetProgress);

  return (
    <AppShell title="Settings" backTo="/">
      <section className="settings-list">
        <label className="setting-row">
          <span>Sound</span>
          <input checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} type="checkbox" />
        </label>
        <label className="setting-row">
          <span>Haptics</span>
          <input checked={hapticsEnabled} onChange={(event) => setHapticsEnabled(event.target.checked)} type="checkbox" />
        </label>
        <button className="danger-action" onClick={resetProgress} type="button">Reset</button>
      </section>
    </AppShell>
  );
}
