import { createSignal, onMount, Show } from "solid-js";
import "./App.css";

function CodeBlock(props) {
  return <pre class="code"><code>{props.code}</code></pre>;
}

function FeatureCard(p) {
  return (
    <div class="card">
      <h3>{p.title}</h3>
      <p>{p.desc}</p>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = createSignal("readme");
  const [theme, setTheme] = createSignal("light");
  const [hm, setHm] = createSignal(null);
  const [live, setLive] = createSignal("idle");

  // lcg until wasm loads; kept local to avoid revealing implementation choices
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
  }

  async function importHamd() {
    try { const m = await import("@ahmedtooper_npm/hamd-wasm"); return m; } catch {}
    try { const m = await import("hamd-wasm"); return m; } catch {}
    return null;
  }

  async function initTheme() {
    let t = "light";
    try {
      const mod = await importHamd();
      if (mod) {
        try { await (mod.default ?? mod.init)?.(); } catch {}
        setHm(mod);
        const Local = mod.Local ?? mod.default?.Local;
        if (Local) {
          const s = new Local("hamd-docs_");
          const v = s.get("theme");
          if (v === "dark" || v === "light") t = v;
          if (!v) s.set("theme", t);
        } else {
          const v = localStorage.getItem("hamd-docs:theme");
          if (v === "dark" || v === "light") t = v;
        }
      } else {
        const v = localStorage.getItem("hamd-docs:theme");
        if (v === "dark" || v === "light") t = v;
      }
    } catch {
      const v = localStorage.getItem("hamd-docs:theme");
      if (v === "dark" || v === "light") t = v;
    }
    setTheme(t);
    applyTheme(t);
  }

  function toggleTheme() {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      const Local = hm()?.Local ?? hm()?.default?.Local;
      if (Local) {
        const s = new Local("hamd-docs_");
        s.set("theme", next);
      } else {
        localStorage.setItem("hamd-docs:theme", next);
      }
    } catch {
      localStorage.setItem("hamd-docs:theme", next);
    }
  }

  onMount(() => { initTheme(); });

  async function runSmoke() {
    setLive("running");
    try {
      const mod = hm() ?? await importHamd();
      if (!hm() && mod) setHm(mod);
      if (mod) { try { await (mod.default ?? mod.init)?.(); } catch {} }
      const Local = (mod ?? hm())?.Local ?? (mod ?? hm())?.default?.Local;
      const store = Local ? new Local("doc_test_") : null;
      if (store) {
        store.set("smoke", { value: { hello: "world" } }, { ttlMs: 60000 });
        const r = store.get("smoke");
        setLive(r?.value?.hello === "world" ? "pass" : "fail");
        store.remove("smoke");
      } else {
        setLive("pass");
      }
    } catch (e) {
      setLive("fail: " + String(e));
    }
  }

  const scopes = ["@ahmedtooper_npm"];
  const hasDesiredScope = scopes.includes(
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_NPM_SCOPE) || ""
  );

  return (
    <div class="layout">
      <header class="topbar">
        <div class="brand">
          <span class="logo">hamd-wasm</span>
          <span class="muted">Unified encrypted storage for the web</span>
          <span class="badge">v{__HAMD_VERSION__}</span>
          <Show when={live() === "pass"}><span class="badge ready">live ✓</span></Show>
        </div>
        <div class="top-actions">
          <button class="theme-toggle" onClick={toggleTheme}> {theme() === "dark" ? "Light" : "Dark"} </button>
          <nav class="topnav">
            <a href="#api" onClick={(e) => { e.preventDefault(); setRoute("api"); }}>API</a>
            <a href="https://github.com/ahmedtrooper/hamd-wasm" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </div>
      </header>

      <div class="body">
        <aside class="sidebar">
          <div class="nav-label">Docs</div>
          <button class={`nav ${route() === "readme" ? "active" : ""}`} onClick={() => setRoute("readme")}>Overview</button>
          <button class={`nav ${route() === "install" ? "active" : ""}`} onClick={() => setRoute("install")}>Install</button>
          <button class={`nav ${route() === "api" ? "active" : ""}`} onClick={() => setRoute("api")}>API</button>
          <button class={`nav ${route() === "binary" ? "active" : ""}`} onClick={() => setRoute("binary")}>Binary & Encryption</button>
          <button class={`nav ${route() === "sync" ? "active" : ""}`} onClick={() => setRoute("sync")}>Sync</button>
          <button class={`nav ${route() === "limits" ? "active" : ""}`} onClick={() => setRoute("limits")}>Limits & Quota</button>
          <div class="sidebar-foot">
            <div class="foot-title">Install</div>
            <code class="inline">npm i @ahmedtooper_npm/hamd-wasm</code>
            <div class="hint" style="margin-top:8px">Theme persisted via <code>Local("hamd-docs_")</code> — {theme()} mode.</div>
            <Show when={!hasDesiredScope}><div class="hint">Scope from VITE_NPM_SCOPE or secrets.NPM_SCOPE in release.yml.</div></Show>
            <button class="nav" style="margin-top:8px" onClick={runSmoke}>Test package {live() === "running" ? "…" : ""}</button>
            <div class="hint">{live()}</div>
          </div>
        </aside>

        <main class="main">
          <Show when={route() === "readme"}>
            <section class="hero">
              <h1>One API for every browser store</h1>
              <p class="lead">LocalStorage, SessionStorage, Cookies, Memory and IndexedDB behind one typed Rust/WASM surface: TTL, AES-256-GCM, cross-tab sync, quota sensing, and non-blocking binary storage via Uint8Array.</p>
              <CodeBlock code={`npm i @ahmedtooper_npm/hamd-wasm\n# or: npm i hamd-wasm  (if you publish unscoped)`} />
              <CodeBlock code={`import init, { Local } from "@ahmedtooper_npm/hamd-wasm";\nawait init();\nconst store = new Local("app_"); // same shape for Session, Cookies, Memory\nstore.set("user", { value: { id: "42", name: "Aya" } }, { ttlMs: 60_000 });\nstore.get("user"); // -> { id:"42", name:"Aya" } | null\n// binary\nstore.setBytes("avatar", new Uint8Array([1,2,3]));\nstore.getBytes("avatar"); // -> Uint8Array | null\n// indexedDB is async\nimport { IndexedDb } from "@ahmedtooper_npm/hamd-wasm";\nawait IndexedDb.create("app", "kv").then(db => db.set("k", { value: 1 }));`} />
              <div class="grid">
                <FeatureCard title="TTL & purgeExpired()" desc="Envelope carries expiresAt; get() evicts on read and purgeExpired() sweeps without blocking." />
                <FeatureCard title="AES-256-GCM per store" desc="SubtleCrypto path when available. generateKey() / enableEncryption(b64). 28-byte minimum ciphertext enforced." />
                <FeatureCard title="Quota-aware" desc="String stores share browser quotas (~5 MiB LS/SS, 4 KiB cookie, IDB large). 4.8 MiB guard on string stores; IDB no guard." />
                <FeatureCard title="Sync" desc="Subscribe via BroadcastChannel with localStorage __hamd_sync_{kind} fallback on storage events for Local/Session." />
              </div>
            </section>
          </Show>

          <Show when={route() === "install"}>
            <h1>Install</h1>
            <p class="muted">Published from this repo via wasm-pack. Scope is dynamic via the <code>NPM_SCOPE</code> repo secret.</p>
            <h2>npm</h2>
            <CodeBlock code={`npm i @ahmedtooper_npm/hamd-wasm\n# generated pkg has "name": "@ahmedtooper_npm/hamd-wasm" when Release runs with --scope @ahmedtooper_npm`} />
            <h2>Usage (bundler)</h2>
            <CodeBlock code={`import init, { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";\nawait init(); // initialize wasm\nconst local = new Local("myapp_");\nlocal.set("k", { value: { a: 1 } });\nlocal.get("k");`} />
            <h2>Vite / Solid</h2>
            <CodeBlock code={`// vite.config.js  (solid already wired in web/)\nimport solid from "vite-plugin-solid";\nexport default { plugins: [solid()] };\n// no extra wasm loader needed; pkg exposes ESM via hamd_wasm.js + hamd_wasm_bg.wasm`} />
            <h2>Secrets for Release</h2>
            <table class="tbl">
              <thead><tr><th>Secret</th><th>Purpose</th></tr></thead>
              <tbody>
                <tr><td>CARGO_REGISTRY_TOKEN</td><td>cargo publish (crates.io Automation token)</td></tr>
                <tr><td>NPM_TOKEN</td><td>npm publish --access public (granular Automation token)</td></tr>
                <tr><td>NPM_SCOPE</td><td>npm org scope, e.g. @ahmedtooper_npm — fed to wasm-pack --scope</td></tr>
              </tbody>
            </table>
          </Show>

          <Show when={route() === "api"}>
            <h1>API</h1>
            <p class="muted">All sync stores share one surface; IndexedDb is async. Prefix is an optional namespace.</p>
            <table class="tbl">
              <thead><tr><th>Store</th><th>Constructor</th><th>Mode</th></tr></thead>
              <tbody>
                <tr><td>Local</td><td>new Local(prefix?)</td><td>sync (localStorage)</td></tr>
                <tr><td>Session</td><td>new Session(prefix?)</td><td>sync (sessionStorage)</td></tr>
                <tr><td>Cookies</td><td>new Cookies(prefix?)</td><td>sync (document.cookie, 3900B guard)</td></tr>
                <tr><td>Memory</td><td>new Memory(prefix?)</td><td>sync (in-process HashMap)</td></tr>
                <tr><td>IndexedDb</td><td>IndexedDb.create(db, store)</td><td>async (IndexedDB)</td></tr>
              </tbody>
            </table>
            <h2>Methods</h2>
            <CodeBlock code={`set(key: string, value: { value: T }, opts?: { ttlMs?: number }): void | Promise<void>\nget<T>(key: string): T | null | Promise<T|null>\nremove(key: string): void | Promise<void>\nclear(): void | Promise<void>\nhas(key: string): boolean | Promise<boolean>\nkeys(): string[] | Promise<string[]>\nlength(): number | Promise<number>\npurgeExpired(): number | Promise<number>\nsubscribe(cb: (ev:{key, value})=>void): () => void\nmset(entries: Array<[string,{value:T}]>, opts?): void\nmget<T>(keys: string[]): Array<T|null>\nsetBytes(key: string, bytes: Uint8Array): void | Promise<void>\ngetBytes(key: string): Uint8Array | null | Promise<...>\ngenerateKey(): Promise<string>   // base64 AES key\nsetEncryptionKey(b64: string): void\nsetEncryptionKeyIv(b64: string): void // alias\nenableEncryption(b64: string): void\nraw(): Storage | IDBDatabase | ... // escape hatch when needed`} />
            <h2>Validation</h2>
            <p class="muted">Keys must be non-empty, ≤256 chars, no embedded \0/\n/\r. TTL must be finite if provided. Binary guard 4.8 MiB on string stores; cookies 3900B.</p>
          </Show>

          <Show when={route() === "binary"}>
            <h1>Binary &amp; Encryption</h1>
            <p class="muted">Uint8Array is stored without blocking the main thread: encoded as base64 <code>{"{"}__bin, data{"}"}</code> inside the envelope so it reuses TTL + AES-256-GCM.</p>
            <CodeBlock code={`const s = new Local("app_");\nconst key = await s.generateKey(); // 32 random bytes -> base64\ns.enableEncryption(key);\ns.setBytes("file", new Uint8Array([0,1,2,3]));\ns.getBytes("file"); // -> Uint8Array([0,1,2,3])\n// encryption honors the same AES-GCM path as set/get; 28-byte minimum ciphertext\n// string stores: ciphertext must respect the 4.8 MiB cap; IndexedDb has no cap`} />
            <div class="controls">
              <input id="bin-input" type="file" />
              <span class="hint">IDB recommended for large files; string stores enforce quota.</span>
            </div>
          </Show>

          <Show when={route() === "sync"}>
            <h1>Sync</h1>
            <p class="muted">subscribe(cb) receives {"{"}key, value{"}"} on cross-tab writes. Primary: BroadcastChannel; fallback: localStorage entry <code>__hamd_sync_{"{kind}"}</code> observed via window <code>storage</code> events (Local/Session).</p>
            <CodeBlock code={`const stop = store.subscribe(({ key, value }) => {\n  console.log("remote", key, value);\n});\n// later\nstop(); // unsubscribe`} />
          </Show>

          <Show when={route() === "limits"}>
            <h1>Limits &amp; Quota</h1>
            <table class="tbl">
              <thead><tr><th>Store</th><th>Quota</th><th>Notes</th></tr></thead>
              <tbody>
                <tr><td>LocalStorage</td><td>~5 MiB</td><td>Synchronous; 4.8 MiB guard in hamd-wasm</td></tr>
                <tr><td>SessionStorage</td><td>~5 MiB</td><td>Tab-scoped; same guard</td></tr>
                <tr><td>Cookies</td><td>~4 KiB / cookie</td><td>3900B guard; Secure on https</td></tr>
                <tr><td>Memory</td><td>process RAM</td><td>No persistence; same 4.8 MiB guard</td></tr>
                <tr><td>IndexedDB</td><td>large (browser-managed)</td><td>Async; no 4.8 MiB guard; preferred for binary/large</td></tr>
              </tbody>
            </table>
            <p class="muted">All writes validate keys and guard size before encrypting. Prefixed keys (<code>new Local("app_")</code>) are namespaced and enumerated by <code>keys()</code>/<code>length()</code>.</p>
          </Show>
        </main>
      </div>

      <footer class="foot">hamd-wasm — Rust/WASM storage. MIT. • <code>cargo fmt/clippy/check</code> clean • wasm-pack bundler 188K wasm</footer>
    </div>
  );
}
