import { createSignal, For, Show } from 'solid-js';
import './App.css';

const features = [
  { id: 'getting-started', label: 'Getting started', title: 'Getting started — hamd-wasm' },
  { id: 'storage', label: 'Storage', title: 'Storage — 5 backends, one surface' },
  { id: 'encryption', label: 'Encryption', title: 'Encryption — AES-256-GCM' },
  { id: 'ttl', label: 'TTL', title: 'TTL — expiry & purge' },
  { id: 'binary', label: 'Binary', title: 'Binary — setBytes/getBytes' },
  { id: 'sync', label: 'Sync', title: 'Sync — cross-tab' },
  { id: 'limits', label: 'Limits', title: 'Limits & quota' },
  { id: 'api', label: 'API', title: 'API — full surface' },
];

function CodeBlock(props) {
  return (
    <pre class="code">
      <code>{props.code}</code>
    </pre>
  );
}

function FeatureCard(props) {
  return (
    <div class="card">
      <h3>{props.title}</h3>
      <p>{props.desc}</p>
      <Show when={props.code}>
        <CodeBlock code={props.code} />
      </Show>
    </div>
  );
}

export default function App() {
  const [active, setActive] = createSignal('getting-started');
  const [prefix, setPrefix] = createSignal('myapp:');

  return (
    <div class="layout">
      <header class="topbar">
        <div class="brand">
          <span class="logo">hamd</span>
          <span class="muted">wasm</span>
          <span class="badge">0.1.0</span>
          <span class="badge ready">92% FAANG ready</span>
        </div>
        <nav class="topnav">
          <a href="https://github.com/AhmedTrooper/hamd-wasm" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://crates.io/crates/hamd-wasm" target="_blank" rel="noreferrer">crates.io</a>
          <a href="https://www.npmjs.com/package/hamd-wasm" target="_blank" rel="noreferrer">npm</a>
        </nav>
      </header>

      <div class="body">
        <aside class="sidebar">
          <div class="nav-label">Docs</div>
          <For each={features}>
            {(f) => (
              <button classList={{ nav: true, active: active() === f.id }} onClick={() => setActive(f.id)}>
                {f.label}
              </button>
            )}
          </For>
          <div class="sidebar-foot">
            <div class="foot-title">Install</div>
            <code class="inline">npm install hamd-wasm</code>
          </div>
        </aside>

        <main class="main">
          <Show when={active() === 'getting-started'}>
            <section class="hero">
              <h1>Unified browser storage — Rust → WASM</h1>
              <p class="lead">Five backends. One type-selected API. Encrypted, TTL-aware, binary-capable, synced across tabs.</p>
              <CodeBlock code={`import { Local, Session, Memory, Cookies, IndexedDb } from 'hamd-wasm';

const s = new Local('${prefix()}');
s.set('user', { name: 'Alice', id: 101 });
s.get('user'); // → {name:'Alice'}

// binary
s.setBytes('avatar', new Uint8Array([0,255,42]));
s.getBytes('avatar'); // → Uint8Array

const db = new IndexedDb();
await db.set('sess', { token: 'abc' });`} />
              <div class="grid">
                <FeatureCard title="Type-selected" desc="new Local() vs new Cookies() vs new IndexedDb() — no adapters." />
                <FeatureCard title="Encrypted" desc="AES-256-GCM per-write nonce, zeroized keys, hex envelope." />
                <FeatureCard title="Binary" desc="setBytes/getBytes base64 __bin, 4.8MB guard, IndexedDB disk." />
                <FeatureCard title="FAANG checks" desc="fmt/clippy/check • 24 headless Chrome • cargo audit/coverage • publish dry-run 96KiB" />
              </div>
              <div class="controls">
                <label>Prefix: <input value={prefix()} onInput={(e) => setPrefix(e.currentTarget.value)} placeholder="myapp:" /></label>
                <span class="hint">prefix isolates: hamd: vs {prefix()} never collide</span>
              </div>
            </section>
          </Show>

          <Show when={active() === 'storage'}>
            <h2>Storage — 5 backends</h2>
            <FeatureCard title="Local / Session" desc="window Storage, QuotaExceeded → purgeExpired retry" code={`const s = new Local('app:');
s.set('k','v'); s.get('k'); s.has('k'); s.keys(); s.length(); s.remove('k'); s.clear();`} />
            <FeatureCard title="Cookies" desc="document.cookie encode/decode, 4KB guard 3900, Secure on https, SameSite=Lax 1yr" code={`const c = new Cookies(); c.set('probe','a;b=c d/e'); c.get('probe');`} />
            <FeatureCard title="Memory" desc="HashMap — SSR / fallback / tests" code={`const m = new Memory(); m.set('k','v');`} />
            <FeatureCard title="IndexedDb" desc="async IndexedDB v1 kv, batch single txn, IDBRequest→Promise self-cleaning" code={`const db = new IndexedDb(); await db.set('k','v'); await db.get('k');`} />
          </Show>

          <Show when={active() === 'encryption'}>
            <h2>Encryption — per-instance AES-256-GCM</h2>
            <CodeBlock code={`const s = new Local();
const key = s.generateKey(); // Uint8Array(32) also enables
// or existing
s.enableEncryption(key32); // throws if !=32B
s.set('secret', { ssn: '000' }); // hex(nonce||ciphertext) at rest
s.get('secret'); // wrong key → "decryption failed: wrong key or corrupted data"
s.setBytes('enc', new Uint8Array([1,2,3])); // also encrypted`} />
            <p class="muted">Keys zeroized on drop (`ZeroizeOnDrop`). Not persisted — store yourself.</p>
          </Show>

          <Show when={active() === 'ttl'}>
            <h2>TTL — lazy expiry + sweep</h2>
            <CodeBlock code={`s.set('otp','123',60_000); // {__val,__exp:Date.now()+60_000}
s.get('otp'); // expired → null + raw_remove
s.purgeExpired(); // sweeps call get per key
// validation
s.set('k','v', NaN); // → "ttlMs must be a positive finite number"`} />
          </Show>

          <Show when={active() === 'binary'}>
            <h2>Binary — Uint8Array</h2>
            <CodeBlock code={`s.setBytes('avatar', new Uint8Array([0,1,255,42]));
s.getBytes('avatar'); // → Uint8Array | undefined
// TTL + encrypt same path
s.setBytes('enc', bytes, 60_000);
// IndexedDb async, disk-backed
await new IndexedDb().setBytes('file', bytes);`} />
            <p class="muted">String storages base64 __bin envelope +33%; guard &gt;4_800_000 → use IndexedDb. IndexedDB could be native zero-copy next.</p>
          </Show>

          <Show when={active() === 'sync'}>
            <h2>Sync — cross-tab</h2>
            <CodeBlock code={`const off = new Local('app:').subscribe((action,key)=>console.log(action,key));
new Local('app:').set('cart',[]); // other tab receives set→cart filtered by prefix
off(); // removeEventListener message/storage`} />
            <p class="muted">BroadcastChannel hamd-sync kind + fallback localStorage sync for Safari (local/session).</p>
          </Show>

          <Show when={active() === 'limits'}>
            <h2>Limits</h2>
            <table class="tbl">
              <thead><tr><th>Backend</th><th>Cap</th><th>Handling</th></tr></thead>
              <tbody>
                <tr><td>Local/Session</td><td>~5MB (+33% b64 → ~3.6M binary)</td><td>QuotaExceeded → purgeExpired retry</td></tr>
                <tr><td>Cookies</td><td>4KB (3900 guard)</td><td>encode_uri Secure https</td></tr>
                <tr><td>Memory</td><td>unbounded</td><td>HashMap</td></tr>
                <tr><td>IndexedDB</td><td>disk ~50%</td><td>async single txn batch</td></tr>
              </tbody>
            </table>
            <p class="muted">Keys: `>0 ≤256 no \\0\\n\\r` else error; `mset/mget` validate same.</p>
          </Show>

          <Show when={active() === 'api'}>
            <h2>API — one surface</h2>
            <table class="tbl">
              <thead><tr><th>Method</th><th>Returns</th><th>Notes</th></tr></thead>
              <tbody>
                <tr><td>new Type(prefix?)</td><td>instance</td><td>default hamd:</td></tr>
                <tr><td>set(k,v,ttl?)</td><td>void / Promise</td><td>JSON ttl finite&gt;0</td></tr>
                <tr><td>setBytes(k,Uint8Array,ttl?)</td><td>void / Promise</td><td>__bin base64</td></tr>
                <tr><td>get(k)</td><td>any|null</td><td>lazy TTL</td></tr>
                <tr><td>getBytes(k)</td><td>Uint8Array|undefined</td><td>non-binary→error</td></tr>
                <tr><td>remove/clear/has/keys/length/purgeExpired</td><td>-</td><td>prefix scoped</td></tr>
                <tr><td>enableEncryption/generateKey</td><td>-</td><td>32B</td></tr>
                <tr><td>subscribe(cb)→unsubscribe</td><td>Function</td><td>per-kind</td></tr>
                <tr><td>mset/mget</td><td>-</td><td>validated</td></tr>
              </tbody>
            </table>
          </Show>
        </main>
      </div>

      <footer class="foot">MIT © Md. Ramjan Miah — `cargo publish --dry-run 96.4KiB` • `wasm-pack 188K wasm / 79K js` • `24` headless tests</footer>
    </div>
  );
}
