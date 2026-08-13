import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const Binary: Component = () => {
  return (
    <Section id="binary" title="Binary (Uint8Array)">
      <p class="section-lead">
        For raw bytes — images, files, blobs — use <code>setBytes</code> /{" "}
        <code>getBytes</code>.
      </p>
      <CodeBlock
        code={`const file = new Uint8Array([0, 1, 255, 42]);

store.setBytes("avatar", file);
store.getBytes("avatar"); // Uint8Array | undefined

// With TTL:
store.setBytes("snapshot", bigBuffer, 60_000);`}
      />
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">setBytes(key, bytes, ttl_ms?)</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "Bytes are wrapped in a { __bin, data } envelope and reuse TTL + encryption.",
          },
          {
            sig: <span class="sig">getBytes(key)</span>,
            ret: (
              <>
                <code>Uint8Array | undefined</code> |{" "}
                <code>Promise&lt;...&gt;</code>
              </>
            ),
            desc: "Returns undefined if missing/expired, throws if the key was set with set() (not a binary value).",
          },
        ]}
      />
      <Alert kind="danger">
        String-backed stores (<code>Local</code>, <code>Session</code>,{" "}
        <code>Cookies</code>) enforce a <strong>4.8 MB binary guard</strong>{" "}
        after base64 encoding. If you hit it, you'll see{" "}
        <code>&quot;bytes too large for string storage, use IndexedDb&quot;</code>.
        Switch to <code>IndexedDb</code> for files.
      </Alert>
    </Section>
  );
};