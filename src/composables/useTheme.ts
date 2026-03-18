import { computed, shallowRef } from "vue";
import type { ThemeMode } from "../types/ui";

const THEME_KEY = "video2book:theme";
const theme = shallowRef<ThemeMode>("light");

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  } catch {
    return null;
  }

  return null;
}

function readSystemTheme(): ThemeMode {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function applyTheme(nextTheme: ThemeMode, persist = true): void {
  theme.value = nextTheme;

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  if (!persist || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    // Игнорируем ошибки localStorage в Electron sandbox.
  }
}

export function initializeTheme(): void {
  applyTheme(readStoredTheme() ?? readSystemTheme(), false);
}

export function useTheme() {
  const isDark = computed(() => theme.value === "dark");

  function setLightTheme(): void {
    applyTheme("light");
  }

  function setDarkTheme(): void {
    applyTheme("dark");
  }

  return {
    theme,
    isDark,
    setLightTheme,
    setDarkTheme,
  };
}
