import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { LevelSelectScreen } from "./screens/LevelSelectScreen.tsx";
import { GameScreen } from "./screens/GameScreen.tsx";
import { SettingsScreen } from "./screens/SettingsScreen.tsx";
import { WinScreen } from "./screens/WinScreen.tsx";
import { LoseScreen } from "./screens/LoseScreen.tsx";

import { TestingDashboard } from "./screens/TestingDashboard.tsx";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/testing" element={<TestingDashboard />} />
        <Route path="/levels" element={<LevelSelectScreen />} />
        <Route path="/game/:level" element={<GameScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/win/:level" element={<WinScreen />} />
        <Route path="/lose/:level" element={<LoseScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
