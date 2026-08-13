import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { readFileSync } from 'node:fs'

let hamdVersion = '0.1.0'
try {
  const cargo = readFileSync(new URL('../Cargo.toml', import.meta.url), 'utf8')
  const m = cargo.match(/^version\s*=\s*"([^"]+)"/m)
  if (m) hamdVersion = m[1]
} catch {}

export default defineConfig({
  plugins: [solid()],
  define: { __HAMD_VERSION__: JSON.stringify(hamdVersion) },
  build: { rolldownOptions: { external: ['hamd-wasm', '@ahmedtooper_npm/hamd-wasm'] } },
})
