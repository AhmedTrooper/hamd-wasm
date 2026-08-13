import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { ApiTable } from "../components/ApiTable";

export const Backends: Component = () => {
  return (
    <Section id="backends" title="Choosing a backend">
      <p class="section-lead">
        All five classes share one method set. The difference is what they sit
        on top of, and whether operations are sync or async.
      </p>
      <ApiTable
        cols={[
          { key: "cls", label: "Class" },
          { key: "backend", label: "Backend" },
          { key: "sync", label: "Sync?" },
          { key: "best", label: "Best for" },
          { key: "limit", label: "Limit" },
        ]}
        rows={[
          {
            cls: <code>Local</code>,
            backend: <code>window.localStorage</code>,
            sync: "sync",
            best: "App data that survives reloads",
            limit: "~5 MB string (~3.6 MB binary)",
          },
          {
            cls: <code>Session</code>,
            backend: <code>window.sessionStorage</code>,
            sync: "sync",
            best: "Tab-only data (wizards, drafts)",
            limit: "~5 MB",
          },
          {
            cls: <code>Cookies</code>,
            backend: <code>document.cookie</code>,
            sync: "sync",
            best: "Server-readable tokens, theme prefs",
            limit: "4 KB / cookie (3900 B guard)",
          },
          {
            cls: <code>Memory</code>,
            backend: (
              <>
                In-process <code>Map</code>
              </>
            ),
            sync: "sync",
            best: "SSR, tests, when window is missing",
            limit: "RAM",
          },
          {
            cls: <code>IndexedDb</code>,
            backend: <code>IndexedDB</code>,
            sync: <strong>async</strong>,
            best: "Files, images, large data",
            limit: "Disk (~50% of free space)",
          },
        ]}
      />
      <p>
        Pick by persistence + size: <code>Local</code> for everything small and
        durable, <code>IndexedDb</code> when you cross the ~5 MB line or need
        binary blobs, <code>Session</code> when you want tab-only isolation,{" "}
        <code>Cookies</code> when the server must see the value,{" "}
        <code>Memory</code> for SSR and tests.
      </p>
    </Section>
  );
};