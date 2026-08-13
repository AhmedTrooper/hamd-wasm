/* Resolves the hamd-wasm package version at runtime.
   `__HAMD_VERSION__` is injected by vite.config.ts from the parent Cargo.toml. */

declare const __HAMD_VERSION__: string;

export const HAMD_VERSION: string =
  typeof __HAMD_VERSION__ !== "undefined" ? __HAMD_VERSION__ : "0.1.0";