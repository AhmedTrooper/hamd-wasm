import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";

export const Dispose: Component = () => {
  return (
    <Section id="dispose" title="Symbol.dispose">
      <p class="section-lead">
        All five classes implement <code>Symbol.dispose</code>, so you can use
        the explicit resource management proposal (<code>using</code>) to ensure
        cleanup.
      </p>
      <CodeBlock
        code={`{
  using store = new Local("app:");
  store.set("temp", data);
  // ...
} // free() / dispose runs here`}
      />
      <p>
        This is most useful with <code>IndexedDb</code> in long-lived processes
        to release the WASM-side handle.
      </p>
    </Section>
  );
};