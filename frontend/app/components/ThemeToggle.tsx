import { Moon, Sun } from "lucide-react";
import { useTheme } from "~/hooks/useTheme";

export function ThemeToggle() {
  const { effectiveTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <button className="h-12 items-center justify-center pr-2" disabled>
        <Moon className="h-8 w-8 scale-100" />
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="h-12 items-center justify-center pr-2"
    >
      {effectiveTheme === "light" ? (
        <Sun className="h-8 w-8 rotate-0 scale-100 text-white" />
      ) : (
        <Moon className="h-8 w-8 scale-100" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
