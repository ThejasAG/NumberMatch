import { Link } from "react-router-dom";

interface LevelButtonProps {
  level: number;
  unlocked: boolean;
}

export function LevelButton({ level, unlocked }: LevelButtonProps) {
  if (!unlocked) return <button className="level-button locked" disabled type="button">{level}</button>;
  return <Link className="level-button" to={`/game/${level}`}>{level}</Link>;
}
