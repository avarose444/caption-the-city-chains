"use client";

import { useSyncExternalStore } from "react";

const OPTIONS = ["light", "dark", "system"] as const;
type Theme = (typeof OPTIONS)[number];

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function choose(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <div role="group" aria-label="Color theme" className="flex border-2 border-ink font-mono text-xs">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => choose(option)}
          className={`px-2 py-1 capitalize ${theme === option ? "bg-ink text-background" : "hover:bg-rule"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
