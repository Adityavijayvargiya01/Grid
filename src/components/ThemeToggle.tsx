import * as React from "react"

import { MoonIcon, SunIcon } from "@phosphor-icons/react"

import { Toggle } from "~/components/ui/toggle"

const STORAGE_KEY = "apg-theme"

type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // ignore
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.style.colorScheme = theme
  document.documentElement.dataset.theme = theme
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme)

  React.useEffect(() => {
    applyTheme(theme)

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const isDark = theme === "dark"

  return (
    <Toggle
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
      className="apg-theme-toggle"
      style={{
        backgroundColor: isDark ? "#ffffff" : "#000000",
        color: isDark ? "#000000" : "#ffffff",
      }}
    >
      {isDark ? <MoonIcon size={18} weight="bold" /> : <SunIcon size={18} weight="bold" />}
    </Toggle>
  )
}
