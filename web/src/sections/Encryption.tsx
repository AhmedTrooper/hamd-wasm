import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { ApiTable } from "../components/ApiTable";
import { Alert } from "../components/Alert";

export const Encryption: Component = () => {
  return (
    <Section id="encryption" title="AES-256-GCM encryption">
      <p class="section-lead">
        Enable per-instance encryption with a 32-byte key. After enabling, every{" "}
        <code>set</code> / <code>setBytes</code> is encrypted before it hits the
        underlying backend; every <code>get</code> / <code>getBytes</code>{" "}
        decrypts on the way out.
      </p>
      <ApiTable
        cols={[
          { key: "sig", label: "Method" },
          { key: "ret", label: "Returns" },
          { key: "desc", label: "Description" },
        ]}
        rows={[
          {
            sig: <span class="sig">generateKey()</span>,
            ret: <code>Uint8Array (32 bytes)</code>,
            desc: "Returns a fresh 32-byte key. Does NOT enable encryption on its own.",
          },
          {
            sig: <span class="sig">enableEncryption(key)</span>,
            ret: <code>void</code>,
            desc: "Takes a Uint8Array of exactly 32 bytes; throws otherwise. From that point on, writes are encrypted.",
          },
        ]}
      />
      <CodeBlock
        code={`import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");

// 1. Generate and enable in one go:
const key = store.generateKey();        // Uint8Array(32)
store.enableEncryption(key);

store.set("secret", { ssn: "000-00-0000" });

// In DevTools you'll see:
//   "hamd:app:secret" = "a1b2c3d4…"   (hex of nonce||ciphertext+tag)
// but store.get("secret") returns { ssn: "000-00-0000" }.

// 2. Bring your own key:
const myKey = crypto.getRandomValues(new Uint8Array(32));
store.enableEncryption(myKey);

// 3. Wrong key → throws:
// store.enableEncryption(new Uint8Array(16));
//   // "key must be exactly 32 bytes"`}
      />
      <Alert kind="warn">
        Encryption protects data <strong>at rest</strong> (what DevTools shows).
        It does <strong>not</strong> protect against a live XSS that can read
        your key while the page is running. Don't ship a key with the page.
      </Alert>
      <h3>Storage format</h3>
      <p>
        Encrypted values are stored as{" "}
        <code>hex(nonce || ciphertext+tag)</code>:
      </p>
      <ul class="bullets">
        <li>12-byte random nonce per write</li>
        <li>AES-256-GCM authenticated ciphertext (16-byte tag)</li>
        <li>
          Minimum stored length: 28 bytes (else{" "}
          <code>&quot;ciphertext too short&quot;</code>)
        </li>
        <li>Keys are zeroized when the instance is dropped</li>
      </ul>
    </Section>
  );
};