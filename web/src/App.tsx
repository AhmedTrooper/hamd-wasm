/* Application shell — composes the layout chrome with the docs sections.
   All section content lives in src/sections/, all chrome in src/layout/. */

import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  type Component,
} from "solid-js";

import { Topbar } from "./layout/Topbar";
import { Sidebar } from "./layout/Sidebar";
import { DrawerBackdrop } from "./layout/DrawerBackdrop";
import { Footer } from "./layout/Footer";

import { Intro } from "./sections/Intro";
import { Install } from "./sections/Install";
import { Backends } from "./sections/Backends";
import { Constructor } from "./sections/Constructor";
import { SetGet } from "./sections/SetGet";
import { MsetMget } from "./sections/MsetMget";
import { Inspect } from "./sections/Inspect";
import { Ttl } from "./sections/Ttl";
import { Dispose } from "./sections/Dispose";
import { Binary } from "./sections/Binary";
import { Encryption } from "./sections/Encryption";
import { Sync } from "./sections/Sync";
import { Errors } from "./sections/Errors";
import { Limits } from "./sections/Limits";
import { Playground } from "./sections/Playground";
import { Hero } from "./sections/Hero";

import { suppressFor, useScrollTracking } from "./hooks/useScrollTracking";
import { NAV } from "./data/nav";
import type { Theme } from "./types";

const SECION_IDS: string[] = NAV.flatMap((g) => g.items.map((i) => i.id));

const App: Component = () => {
  const [route, setRoute] = createSignal<string>("intro");
  const [theme, setTheme] = createSignal<Theme>("dark");
  const [navOpen, setNavOpen] = createSignal(false);

  /* Scroll-tracking: keeps the active sidebar item and URL hash in sync
     with whichever section is in view. */
  const scrollState = useScrollTracking({
    ids: SECION_IDS,
    onActive: (id) => {
      if (id === route()) return;
      setRoute(id);
      if (!scrollState.suppress) {
        try {
          history.replaceState(null, "", id === "intro" ? " " : "#" + id);
        } catch {}
      }
    },
  });

  /* Theme — applied to <html data-theme="..."> */
  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
  };

  const toggleTheme = () => {
    const next: Theme = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("hamd-docs:theme", next);
    } catch {}
  };

  /* Drawer open/close: locks body scroll, supports Escape-to-close */
  const toggleNav = () => setNavOpen(!navOpen());
  const closeNav = () => setNavOpen(false);

  createEffect(() => {
    document.body.classList.toggle("nav-locked", navOpen());
  });

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && navOpen()) closeNav();
  };

  /* Navigation: scroll to section, close drawer, suppress observer */
  const go = (id: string) => {
    setRoute(id);
    closeNav();
    suppressFor(scrollState, 700);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      history.replaceState(null, "", id === "intro" ? " " : "#" + id);
    } catch {}
  };

  const onBrandClick = (e: MouseEvent) => {
    e.preventDefault();
    go("intro");
  };

  onMount(() => {
    /* Restore theme from localStorage */
    try {
      const t = localStorage.getItem("hamd-docs:theme");
      if (t === "light" || t === "dark") {
        setTheme(t);
      } else {
        localStorage.setItem("hamd-docs:theme", theme());
      }
    } catch {}
    applyTheme(theme());

    /* Global keyboard listener */
    window.addEventListener("keydown", onKeydown);
  });

  onCleanup(() => {
    document.body.classList.remove("nav-locked");
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", onKeydown);
    }
  });

  return (
    <div class={`layout ${navOpen() ? "nav-open" : ""}`}>
      <Topbar
        theme={theme}
        onToggleTheme={toggleTheme}
        navOpen={navOpen}
        onToggleNav={toggleNav}
        onGoHome={onBrandClick}
      />

      <DrawerBackdrop onClick={closeNav} />

      <Sidebar activeId={route} onNavigate={go} />

      <main class="main">
        <Hero
          onGetStarted={() => go("install")}
          onViewExamples={() => go("playground")}
        />

        <Intro />
        <Install />
        <Backends />
        <Constructor />
        <SetGet />
        <MsetMget />
        <Inspect />
        <Ttl />
        <Dispose />
        <Binary />
        <Encryption />
        <Sync />
        <Errors />
        <Limits />
        <Playground />

        <Footer />
      </main>
    </div>
  );
};

export default App;