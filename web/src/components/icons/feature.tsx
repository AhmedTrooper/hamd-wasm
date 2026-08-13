/* Feature-illustration icons used in the hero cards. */

import type { JSX } from "solid-js";

const base = {
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

export function KeyIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M17 12v3M21 12v2" />
    </svg>
  );
}

export function ClockIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function BytesIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10v4M11 9v6M15 10v4M19 9v6" />
    </svg>
  );
}

export function SyncIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" />
      <path d="M16 4l4 1-1 4M8 20l-4-1 1-4" />
    </svg>
  );
}