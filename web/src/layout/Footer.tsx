import type { Component } from "solid-js";

export const Footer: Component = () => {
  return (
    <footer class="doc-foot">
      <div>
        <strong>hamd-wasm</strong> · MIT · © 2026 Md. Ramjan Miah
      </div>
      <div class="foot-links">
        <a
          href="https://github.com/AhmedTrooper/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/@ahmedtooper_npm/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          npm
        </a>
        <a
          href="https://crates.io/crates/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          crates.io
        </a>
      </div>
    </footer>
  );
};