import type { CodeSample } from "../types";

export const PLAYGROUND_SAMPLES: CodeSample[] = [
  {
    id: "basic",
    label: "Basic",
    code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
store.set("user", { id: 42, name: "Alice" });
console.log(store.get("user"));
// { id: 42, name: "Alice" }`,
  },
  {
    id: "ttl",
    label: "TTL",
    code: `import { Session } from "@ahmedtooper_npm/hamd-wasm";

const wizard = new Session("wizard:");
wizard.set("step1", { name: "email" });
wizard.set("otp", "123456", 60_000); // 60s

setTimeout(() => {
  console.log(wizard.get("otp")); // null — lazy-evicted
}, 61_000);`,
  },
  {
    id: "binary",
    label: "Binary",
    code: `import { IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

const db = new IndexedDb("app:");
const avatar = new Uint8Array([0, 1, 255, 42]);
await db.setBytes("avatar", avatar);
console.log(await db.getBytes("avatar"));
// Uint8Array(4) [0, 1, 255, 42]`,
  },
  {
    id: "encrypt",
    label: "Encrypt",
    code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
const key = store.generateKey();   // Uint8Array(32)
store.enableEncryption(key);

store.set("secret", { ssn: "000-00-0000" });
console.log(store.get("secret"));
// { ssn: "000-00-0000" }`,
    note: "Stored value in DevTools is hex(nonce || ciphertext+tag).",
  },
  {
    id: "sync",
    label: "Sync",
    code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
const off = store.subscribe((action, key) => {
  // action: "set" | "remove" | "clear"
  // key:    string ("" when action === "clear")
  console.log("remote", action, key);
});

store.set("cart", [1, 2, 3]); // broadcasts to other tabs
off();`,
  },
  {
    id: "bulk",
    label: "Bulk",
    code: `import { Memory } from "@ahmedtooper_npm/hamd-wasm";

const cache = new Memory("cache:");
cache.mset({ a: 1, b: 2, c: 3 }, 5_000);
console.log(cache.mget(["a", "b", "missing"]));
// { a: 1, b: 2, missing: null }`,
  },
];

export const INSTALL_SAMPLES: CodeSample[] = [
  {
    id: "npm",
    label: "npm",
    code: `npm install @ahmedtooper_npm/hamd-wasm`,
    note: "Node 18+. Adds to package.json + package-lock.json.",
  },
  {
    id: "yarn",
    label: "yarn",
    code: `yarn add @ahmedtooper_npm/hamd-wasm`,
    note: "Yarn 1.x classic and Yarn berry both accept `add`.",
  },
  {
    id: "pnpm",
    label: "pnpm",
    code: `pnpm add @ahmedtooper_npm/hamd-wasm`,
    note: "Fastest install on large monorepos.",
  },
  {
    id: "bun",
    label: "bun",
    code: `bun add @ahmedtooper_npm/hamd-wasm`,
    note: "Bun 1.0+. Adds to package.json + bun.lock.",
  },
];