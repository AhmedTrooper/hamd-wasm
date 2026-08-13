import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const SetGet: Component = () => {
  return (
    <Section id="set-get" title="set / get / has / remove">
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">set(key, value, ttl_ms?)</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "JSON-encodes value and stores it. ttl_ms in ms (positive finite number).",
          },
          {
            sig: <span class="sig">get(key)</span>,
            ret: <code>any</code>,
            desc: "Returns the stored value, null if missing, undefined for missing binary. Expired keys auto-evict and return null.",
          },
          {
            sig: <span class="sig">has(key)</span>,
            ret: <code>boolean</code>,
            desc: "True if the key exists and is not expired.",
          },
          {
            sig: <span class="sig">remove(key)</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "Deletes a single key. Broadcasts a remove event to subscribers.",
          },
        ]}
      />
      <CodeBlock
        code={`import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");

store.set("user",   { id: 42, name: "Alice" });
store.set("count",  42);
store.set("active", true);

store.get("user");   // { id: 42, name: "Alice" }
store.get("ghost");  // null
store.has("user");   // true
store.has("ghost");  // false
store.remove("user");
store.has("user");   // false`}
      />
      <Alert kind="note">
        <code>get()</code> on a JSON value returns <code>null</code> when the key
        is missing or expired. <code>getBytes()</code> returns{" "}
        <code>undefined</code> in the same situation. (See Binary below.)
      </Alert>
    </Section>
  );
};