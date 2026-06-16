import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppShellProps {
  title: string;
  children: ReactNode;
  backTo?: string;
}

export function AppShell({ title, children, backTo }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="top-bar">
        {backTo ? <Link className="icon-button" to={backTo} aria-label="Home">🏠</Link> : <span className="top-spacer" />}
        <h1 className="stage-title">{title}</h1>
        <Link className="icon-button pause-btn" to="/settings" aria-label="Pause">⏸</Link>
      </header>
      {children}
    </main>
  );
}
