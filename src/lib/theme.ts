export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "notedt:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLORS = { light: "#00766c", dark: "#111516" } as const;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

let preference = readPreference();

function resolve(pref: ThemePreference): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function apply() {
  const theme = resolve(preference);
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
}

export function getThemePreference() {
  return preference;
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Preference just won't persist (e.g. storage blocked).
  }
  apply();
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Applies the saved preference and follows OS changes while on "system". */
export function initTheme() {
  apply();
  window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (preference === "system") apply();
  });
}
