// Light, dark, or follow the operating system. The choice is stored in the browser and applied
// by setting data-theme on <html>, which styles.css uses to pick its color tokens.

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "stay-the-course-theme";

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked (private windows); the theme still applies for this visit.
  }
}
