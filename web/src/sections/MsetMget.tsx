import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const MsetMget: Component = () => {
  return (
    <Section id="mset-mget" title="mset / mget">
      <p class="section-lead">
        Bulk variants. Both validate every key the same way as <code>set</code> /{" "}
        <code>get</code>.
      </p>
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">mset(entries, ttl_ms?)</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "entries is a plain object { key: value, ... }. A single TTL applies to all.",
          },
          {
            sig: <span class="sig">mget(keys)</span>,
            ret: <code>{`{ [k]: value | null }`}</code>,
            desc: "Returns an object keyed by the input keys; missing/expired entries map to null.",
          },
        ]}
      />
      <CodeBlock
        code={`store.mset({ a: 1, b: 2, c: 3 }, 5_000); // 5-second TTL on all

store.mget(["a", "b", "missing"]);
// {
//   a: 1,
//   b: 2,
//   missing: null
// }`}
      />
      <Alert kind="danger" title="Validation">
        Every key is validated. Non-string keys throw{" "}
        <code>&quot;mset keys must be strings&quot;</code> or{" "}
        <code>&quot;mget keys must be strings&quot;</code>.
      </Alert>
    </Section>
  );
};