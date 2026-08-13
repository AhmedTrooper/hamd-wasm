import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { Alert } from "../components/Alert";

export const Constructor: Component = () => {
  return (
    <Section id="constructor" title="Constructor & prefix">
      <p class="section-lead">
        All five classes take an optional namespace prefix. Prefixes isolate
        keys — two stores with different prefixes never collide, and{" "}
        <code>clear()</code> only deletes keys that start with the store's
        prefix.
      </p>
      <CodeBlock
        code={`new Local();            // prefix "hamd:"  (default)
new Local("app:");       // custom
new Local(null as any);  // also "hamd:"
new Session("wizard:");
new Cookies("prefs:");
new Memory();            // SSR-safe (no window required)
new IndexedDb("app:");   // async ops; same prefix semantics`}
      />
      <CodeBlock
        code={`const a = new Local("app:");
const b = new Local("admin:");
a.set("x", 1);
b.set("x", 2);
a.clear(); // only deletes app:x
b.get("x"); // 2`}
      />
      <Alert kind="tip">
        Use prefixes to namespace per feature: <code>orders:</code>,{" "}
        <code>auth:</code>, <code>cache:</code>. The default <code>hamd:</code>{" "}
        is fine for prototypes; switch to a project prefix before shipping.
      </Alert>
    </Section>
  );
};