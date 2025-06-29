import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

function getStoredTheme(): Theme {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("theme") as Theme;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      return stored;
    }
  }
  return "system";
}

function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(theme: "light" | "dark") {
  if (typeof window !== "undefined") {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const effectiveTheme = getEffectiveTheme(theme);
    applyTheme(effectiveTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const effectiveTheme = getEffectiveTheme(theme);
    applyTheme(effectiveTheme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme(theme);
      applyTheme(effectiveTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const effectiveTheme = getEffectiveTheme(theme);
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return {
    theme,
    effectiveTheme: mounted ? getEffectiveTheme(theme) : "dark",
    setTheme,
    toggleTheme,
    mounted,
  };
}