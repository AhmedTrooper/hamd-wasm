import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const Ttl: Component = () => {
  return (
    <Section id="ttl" title="TTL & purgeExpired">
      <p class="section-lead">
        Pass a positive finite number of milliseconds as the third argument to{" "}
        <code>set</code> or <code>mset</code>. Entries are stored with an
        envelope <code>{`{ __val, __exp }`}</code> that records their expiry
        time.
      </p>
      <CodeBlock
        code={`store.set("otp", "123456", 60_000);  // expires in 60s
store.set("token", jwt, 15 * 60_000);          // 15 minutes

// Lazy expiry:
store.get("otp");   // returns the value, deletes the underlying entry
// ... 60s later ...
store.get("otp");   // null`}
      />
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">purgeExpired()</span>,
            ret: (
              <>
                <code>void</code> | <code>Promise&lt;void&gt;</code>
              </>
            ),
            desc: "Walks every key under the prefix and forces a get(); expired entries are removed.",
          },
        ]}
      />
      <CodeBlock
        code={`// Proactively sweep all TTL entries
await store.purgeExpired();`}
      />
      <Alert kind="tip">
        You rarely need <code>purgeExpired()</code> — expired entries are
        removed the first time anyone calls <code>get()</code> on them. Use it
        when you want a clean storage area (e.g. after a logout).
      </Alert>
    </Section>
  );
};