/* UI control icons — menu, close, theme toggle, arrow, brand mark. */

import type { JSX } from "solid-js";

const base = {
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

export function SunIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function MoonIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function MenuIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function CloseIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function ArrowRight(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function StackIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4" />
    </svg>
  );
}