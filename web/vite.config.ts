import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let hamdVersion = "0.1.0";
try {
  const cargoPath = fileURLToPath(new URL("../Cargo.toml", import.meta.url));
  const cargo = readFileSync(cargoPath, "utf8");
  const m = cargo.match(/^version\s*=\s*"([^"]+)"/m);
  if (m && m[1]) hamdVersion = m[1];
} catch {
  /* no Cargo.toml in dev — fall back to default */
}

export default defineConfig({
  plugins: [solid()],
  define: { __HAMD_VERSION__: JSON.stringify(hamdVersion) },
  build: {
    rolldownOptions: {
      external: ["hamd-wasm", "@ahmedtooper_npm/hamd-wasm"],
    },
  },
});