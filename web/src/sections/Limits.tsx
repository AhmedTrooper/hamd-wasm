import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { ApiTable } from "../components/ApiTable";

export const Limits: Component = () => {
  return (
    <Section id="limits" title="Limits & quota">
      <ApiTable
        cols={[
          { key: "back", label: "Backend" },
          { key: "cap", label: "Cap" },
          { key: "handle", label: "Handling" },
        ]}
        rows={[
          {
            back: (
              <>
                <code>Local</code> / <code>Session</code>
              </>
            ),
            cap: "~5 MB string (~3.6 MB binary)",
            handle: (
              <>
                On <code>QuotaExceededError</code> / code 22:{" "}
                <code>purgeExpired()</code> → retry once
              </>
            ),
          },
          {
            back: <code>Cookies</code>,
            cap: "4 KB / cookie (3900 B guard)",
            handle: (
              <>
                <code>encodeURIComponent</code> /{" "}
                <code>decodeURIComponent</code>, <code>Secure</code> on{" "}
                <code>https:</code>
              </>
            ),
          },
          {
            back: <code>Memory</code>,
            cap: (
              <>
                unbounded <code>Map</code>
              </>
            ),
            handle: "No quota; SSR-safe (no window needed)",
          },
          {
            back: <code>IndexedDb</code>,
            cap: "Disk ~50% of free space (GBs)",
            handle: (
              <>
                Async batched in a single <code>readwrite</code> txn; same
                quota-retry strategy
              </>
            ),
          },
        ]}
      />
    </Section>
  );
};