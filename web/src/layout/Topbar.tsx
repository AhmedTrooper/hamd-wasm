import { Show, type Component } from "solid-js";
import { StackIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon } from "../components/icons";
import { HAMD_VERSION } from "../lib/version";
import type { Theme } from "../types";

export interface TopbarProps {
  theme: () => Theme;
  onToggleTheme: () => void;
  navOpen: () => boolean;
  onToggleNav: () => void;
  onGoHome: (e: MouseEvent) => void;
}

export const Topbar: Component<TopbarProps> = (props) => {
  return (
    <header class="topbar">
      <button
        class="nav-toggle"
        onClick={props.onToggleNav}
        aria-label="Toggle navigation"
        aria-expanded={props.navOpen()}
      >
        <Show when={!props.navOpen()} fallback={<CloseIcon />}>
          <MenuIcon />
        </Show>
      </button>
      <a class="brand" href="#intro" onClick={props.onGoHome}>
        <div class="brand-mark">
          <StackIcon />
        </div>
        <div class="brand-text">
          <span class="brand-title">hamd-wasm</span>
          <span class="brand-sub">Unified encrypted browser storage</span>
        </div>
        <span class="brand-version">v{HAMD_VERSION}</span>
      </a>
      <nav class="topnav">
        <a
          class="topnav-link"
          href="https://github.com/AhmedTrooper/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          class="topnav-link"
          href="https://www.npmjs.com/package/@ahmedtooper_npm/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          npm
        </a>
        <button
          class="theme-toggle"
          onClick={props.onToggleTheme}
          aria-label="Toggle theme"
        >
          <Show when={props.theme() === "dark"} fallback={<SunIcon />}>
            <MoonIcon />
          </Show>
        </button>
      </nav>
    </header>
  );
};