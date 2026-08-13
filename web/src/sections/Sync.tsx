import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const Sync: Component = () => {
  return (
    <Section id="sync" title="Cross-tab sync">
      <p class="section-lead">
        <code>subscribe(cb)</code> lets one tab react to writes from another.
        The callback receives <code>(action, key)</code>:
      </p>
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">subscribe(cb)</span>,
            ret: <code>{`() => void (unsubscribe)`}</code>,
            desc: 'cb(action: "set" | "remove" | "clear", key: string). key is "" for clear.',
          },
        ]}
      />
      <CodeBlock
        code={`const store = new Local("app:");

const unsubscribe = store.subscribe((action, key) => {
  if (action === "clear") {
    console.log("another tab cleared", store);
    return;
  }
  console.log("remote", action, key);
  if (action === "set" && key === "cart") {
    refreshCart();
  }
});

store.set("cart", [1, 2, 3]); // broadcasts to other tabs

// Later:
unsubscribe();`}
      />
      <Alert kind="note">
        Transport is{" "}
        <code>{`BroadcastChannel("hamd-sync-{kind}")`}</code> with a{" "}
        <code>localStorage</code> + <code>storage</code>-event fallback for
        Safari (Local / Session only). Messages are filtered by prefix, so two
        stores with different prefixes won't see each other's events.
      </Alert>
    </Section>
  );
};