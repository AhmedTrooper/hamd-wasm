import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { Tabs } from "../components/Tabs";
import { Alert } from "../components/Alert";
import { INSTALL_SAMPLES } from "../data/samples";

export const Install: Component = () => {
  return (
    <Section id="install" title="Installation">
      <p class="section-lead">
        Published from the repo via <code>wasm-pack</code>. The package ships{" "}
        <code>hamd_wasm_bg.wasm</code>, the JS glue, and a <code>.d.ts</code> —
        no Rust toolchain required at install time.
      </p>

      <h3>Install</h3>
      <p>
        Pick your package manager. Each command installs the same package and
        its wasm artifact.
      </p>
      <Tabs samples={INSTALL_SAMPLES} />

      <h3>Quick import</h3>
      <p>Five classes, one import:</p>
      <CodeBlock
        code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";`}
      />

      <h3>TypeScript</h3>
      <p>
        Types are included. The package exports five classes — use them
        directly:
      </p>
      <CodeBlock
        code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

const store: Local = new Local("app:");
store.set("k", { v: 1 });`}
      />
      <Alert kind="note">
        The five classes all implement the same interface (modulo{" "}
        <code>Promise</code> for <code>IndexedDb</code>). There is no default
        export and no <code>init()</code> call — wasm is loaded by the module
        itself.
      </Alert>
    </Section>
  );
};