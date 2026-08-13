import type { Component } from "solid-js";
import { CodeBlock } from "../components/CodeBlock";
import { Alert } from "../components/Alert";
import { Section } from "../components/Section";

export const Intro: Component = () => {
  return (
    <Section id="intro" title="What is hamd-wasm?">
      <p class="section-lead">
        Every browser gives you storage. None of them give you <em>one</em> API.{" "}
        <code>localStorage</code> is sync but tiny. <code>IndexedDB</code> is
        huge but async. <code>document.cookie</code> goes to the server. They
        have different shapes, different errors, different lifetimes. Switching
        backends means rewriting code.
      </p>
      <p>
        <strong>hamd-wasm</strong> gives you five classes with the{" "}
        <em>exact same method set</em>:
      </p>
      <CodeBlock
        code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

// Sync — backed by window.localStorage
const a = new Local("app:");
a.set("user", { id: 42, name: "Alice" });
a.get("user"); // { id: 42, name: "Alice" }

// Async — backed by IndexedDB. Same method names.
const b = new IndexedDb("app:");
await b.set("user", { id: 42, name: "Alice" });
await b.get("user");`}
      />
      <Alert kind="tip" title="Drop-in migration">
        Change <code>new Local("app:")</code> to{" "}
        <code>new IndexedDb("app:")</code> and add <code>await</code>. That's
        the whole migration.
      </Alert>
    </Section>
  );
};