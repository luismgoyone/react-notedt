import { useSyncExternalStore } from "react";
import {
  getThemePreference,
  setThemePreference,
  subscribeTheme,
} from "../lib/theme";

export function useThemePreference() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference);
  return [preference, setThemePreference] as const;
}
