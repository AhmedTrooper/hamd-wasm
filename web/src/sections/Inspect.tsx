import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";

export const Inspect: Component = () => {
  return (
    <Section id="inspect" title="keys / length / clear">
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">keys()</span>,
            ret: (
              <>
                <code>string[]</code> | <code>Promise&lt;string[]&gt;</code>
              </>
            ),
            desc: "Keys under this store's prefix, with the prefix stripped.",
          },
          {
            sig: <span class="sig">length()</span>,
            ret: (
              <>
                <code>number</code> | <code>Promise&lt;number&gt;</code>
              </>
            ),
            desc: "Count of keys under this store's prefix.",
          },
          {
            sig: <span class="sig">clear()</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "Deletes only keys that start with this store's prefix. Broadcasts a clear event.",
          },
        ]}
      />
      <CodeBlock
        code={`const store = new Local("app:");
store.set("a", 1);
store.set("b", 2);
store.set("c", 3);

store.keys();   // ["a", "b", "c"]
store.length(); // 3

store.clear();
store.length(); // 0`}
      />
      <p>
        <code>clear()</code> is scope-safe: it walks every key under the
        store's prefix and removes only those. Stores with different prefixes
        never interfere.
      </p>
    </Section>
  );
};