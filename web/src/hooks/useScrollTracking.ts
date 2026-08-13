/* Wires up the IntersectionObserver that tracks which section is in view.
   Returns the shared `scrollState` reference so callers can suppress updates
   during programmatic jumps (e.g. clicking a sidebar link). */

import { onCleanup, onMount } from "solid-js";

export interface UseScrollTrackingOptions {
  /* Called whenever the active section changes (and scrollState is not suppressed). */
  onActive: (id: string) => void;
  /* Initial list of known section ids — used to validate deep-link hashes. */
  ids: string[];
  /* Root margin for the IntersectionObserver. */
  rootMargin?: string;
}

export function useScrollTracking(options: UseScrollTrackingOptions) {
  const scrollState = { suppress: false };
  const { onActive, ids, rootMargin = "-72px 0px -65% 0px" } = options;

  onMount(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(".main .section[id]")
    );

    const setActive = (id: string) => {
      if (!id) return;
      onActive(id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollState.suppress) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin, threshold: [0, 0.1, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));

    const onScroll = () => {
      if (scrollState.suppress) return;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && sections.length) {
        setActive(sections[sections.length - 1]!.id);
        return;
      }
      if (window.scrollY < 80) setActive("intro");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const applyHash = () => {
      const hash = (location.hash || "").replace(/^#/, "");
      if (hash && ids.includes(hash)) {
        scrollState.suppress = true;
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ block: "start" });
        setActive(hash);
        window.setTimeout(() => {
          scrollState.suppress = false;
        }, 800);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);

    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", applyHash);
    });
  });

  return scrollState;
}

/* Suppress the observer for `ms` milliseconds — call before a smooth scroll. */
export function suppressFor(scrollState: { suppress: boolean }, ms = 700) {
  scrollState.suppress = true;
  window.setTimeout(() => {
    scrollState.suppress = false;
  }, ms);
}