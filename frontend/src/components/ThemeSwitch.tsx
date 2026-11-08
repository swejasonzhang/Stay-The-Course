import { useEffect, useState, type ReactNode } from "react";
import { applyThemeChoice, readThemeChoice, type ThemeChoice } from "../lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons";

const OPTIONS: { choice: ThemeChoice; label: string; icon: ReactNode }[] = [
  { choice: "light", label: "Light theme", icon: <SunIcon size={16} /> },
  { choice: "dark", label: "Dark theme", icon: <MoonIcon size={16} /> },
  { choice: "system", label: "Match my device", icon: <MonitorIcon size={16} /> },
];

// Three buttons in one pill: light, dark, or follow the device. The chosen one is highlighted.
// aria-pressed tells screen readers which one is on.
export function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);

  useEffect(() => {
    applyThemeChoice(choice);
  }, [choice]);

  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button key={option.choice} type="button" aria-pressed={choice === option.choice}
          onClick={() => setChoice(option.choice)} title={option.label}>
          {option.icon}
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
