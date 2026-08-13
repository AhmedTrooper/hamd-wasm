# hamd-wasm

**Hamd** — unified, encrypted, type-safe browser storage for JavaScript/TypeScript, built in Rust and compiled to WebAssembly.

One API surface. Five backends. The backend is chosen by which type you instantiate — `new Local()`, `new Cookies()`, `new IndexedDb()` — and every type exposes the same methods.

```ts
import { Local, Session, Memory, Cookies, IndexedDb } from 'hamd-wasm';

const store = new Local();              // localStorage
// const store = new Session();         // sessionStorage
// const store = new Memory();          // in-memory (SSR / testing / fallback)
// const store = new Cookies();         // document.cookie
// const store = new IndexedDb();       // IndexedDB (async API)

store.set('user', { name: 'Alice', id: 101 });
store.get('user');                      // → { name: 'Alice', id: 101 }
```

## Why

- **Single API, type-selected backends** — no adapters, no factory functions, no driver leakage. `let x = new Cookies()` vs `let y = new Local()` is the entire configuration.
- **Real encryption** — AES-256-GCM (RustCrypto) with per-write random nonces and `zeroize`-cleared keys, compiled to WASM. Values at rest are ciphertext; DevTools shows nothing readable.
- **Rust safety in the browser** — memory-safe, no `unsafe`, all shared state behind `parking_lot` mutexes, zero-copy WASM execution.
- **Tiny** — built with `opt-level = "z"`, LTO, `panic = "abort"`, and `wasm-opt` via wasm-pack.

## Feature status

### Completed

| Feature | Details |
| --- | --- |
| Backends | `Local`, `Session` (Web Storage), `Cookies` (`document.cookie`), `Memory` (HashMap), `IndexedDb` (async, lazy DB open, batch deletes) |
| Core ops | `set` / `get` / `remove` / `clear` / `has` / `keys` / `length` — identical on every type |
| Encryption | `enableEncryption(key32)` / `generateKey()` — AES-256-GCM, hex envelope `nonce ‖ ciphertext`, keys zeroized on drop |
| TTL | `set(key, value, ttlMs)` — `{__val, __exp}` envelope; `get`/`has` lazy-evict expired entries; `purgeExpired()` sweeps proactively |
| Cross-tab sync | BroadcastChannel per backend kind; `subscribe(cb)` returns an unsubscribe function; set/remove/clear broadcast `{action, prefix, key}` filtered by instance prefix |
| Bulk ops | `mset(entriesObj, ttlMs?)`, `mget(keysArray) → object` |
| Quota recovery | `QuotaExceededError` detected (Web Storage + IndexedDB); `set` evicts expired entries and retries once before failing |
| Namespacing | Key prefix per instance (default `hamd:`) |
| CI / CD | GitHub Actions: fmt + clippy (`-D warnings`) + check + wasm-pack build; release pipeline publishes to crates.io + npm on `v*` tags |

### Remaining

- [ ] `wasm-pack` packaging pass (npm package metadata, verified `pkg/` output)
- [ ] Integration tests (`wasm-bindgen-test`, node-runnable for crypto/memory; browser run for the rest)
- [ ] Publish to crates.io and npm

See [`progress.md`](./progress.md) for the full development tracker.

## Usage

### Install (once published)

```bash
npm install hamd-wasm
```

End users need **no Rust toolchain** — the npm package ships the compiled `.wasm`, JS glue, and `.d.ts` types.

### Basic operations

```ts
import { Local } from 'hamd-wasm';

const store = new Local();                  // default prefix "hamd:"
const appStore = new Local('myapp:');       // custom prefix

store.set('user', { name: 'Alice', age: 25 });
store.get('user');                          // { name: 'Alice', age: 25 }
store.has('user');                          // true
store.keys();                               // ['user']
store.length();                             // 1
store.remove('user');
store.clear();                              // removes only keys with this instance's prefix
```

### IndexedDB (async variant)

Same method names, Promise-returning — IndexedDB is inherently asynchronous:

```ts
import { IndexedDb } from 'hamd-wasm';

const db = new IndexedDb();
await db.set('session', { token: 'abc' });
const session = await db.get('session');
```

### TTL (time-to-live)

```ts
store.set('otp', '123456', 60_000);         // expires in 60 s
store.get('otp');                           // → value, or null after expiry (entry auto-removed)
store.purgeExpired();                       // proactively sweep all expired keys
```

Values without a TTL are stored as plain JSON (no envelope), so existing data stays readable.

### Encryption

```ts
const store = new Local();

const key = store.generateKey();            // Uint8Array(32) — persist it yourself (e.g. server-side)
// — or, with a key you already have:
store.enableEncryption(existingKey32Bytes); // throws if not exactly 32 bytes

store.set('secret', { ssn: '000-12-3456' }); // stored as AES-256-GCM ciphertext
store.get('secret');                          // decrypted transparently
```

Notes:
- Encryption is per-instance state; enable it right after construction.
- `get` of data written with a different key fails with `decryption failed: wrong key or corrupted data`.
- Client-side encryption protects stored data from DevTools/storage inspection. It cannot protect against a live attacker who can execute JS in the page and holds the key.

### Cross-tab sync

```ts
const store = new Local();
const unsubscribe = store.subscribe((action, key) => {
  console.log(`${action} → ${key}`);        // from another tab (or another instance)
});

store.set('cart', [1, 2, 3]);               // broadcasts { action: 'set', key: 'cart' }
unsubscribe();                              // stop listening
```

Channels are scoped per backend kind (`hamd-sync-local`, `hamd-sync-indexeddb`, …) and events are filtered by instance prefix.

### Bulk operations

```ts
store.mset({ a: 1, b: 2, c: 3 });            // optional 2nd arg: shared TTL in ms
store.mget(['a', 'b', 'missing']);           // → { a: 1, b: 2, missing: null }
```

## API reference

Every type (`Local`, `Session`, `Memory`, `Cookies`, `IndexedDb`) exposes:

| Method | Returns | Notes |
| --- | --- | --- |
| `new Type(prefix?)` | instance | default prefix `hamd:` |
| `set(key, value, ttlMs?)` | `void` / `Promise<void>` | JSON-serialized; optional TTL in ms |
| `get(key)` | `value \| null` | lazy TTL eviction |
| `remove(key)` | `void` | |
| `clear()` | `void` | only this instance's prefix |
| `has(key)` | `boolean` | TTL-aware |
| `keys()` | `string[]` | prefix stripped |
| `length()` | `number` | count under prefix |
| `purgeExpired()` | `void` | evict all expired entries |
| `enableEncryption(key)` | `void` | `key`: exactly 32 bytes |
| `generateKey()` | `Uint8Array(32)` | also enables encryption |
| `subscribe(cb)` | unsubscribe fn | `(action, key) => void` |
| `mset(obj, ttlMs?)` | `void` | batch write |
| `mget(keys)` | `object` | batch read |

`IndexedDb` returns Promises for everything except the constructor, `enableEncryption`, `generateKey`, and `subscribe`.

## Architecture

```
src/
├── lib.rs        impl_storage! macro → Local, Session, Memory, Cookies (sync)
│                 + IndexedDb (async), shared by all: prefixing, encryption, TTL, sync
├── ops.rs        StorageOps trait + StorageError (QuotaExceeded | Other)
├── web.rs        Web Storage backend (localStorage / sessionStorage)
├── cookie.rs     Cookie backend (HtmlDocument.cookie)
├── memory.rs     HashMap backend (SSR-safe fallback)
├── idb.rs        IndexedDB backend: lazy open, IDBRequest→Promise, batch deletes
├── crypto.rs     AES-256-GCM, zeroize-wrapped keys, getrandom nonces
├── envelope.rs   TTL envelope wrap/unwrap
└── sync.rs       BroadcastChannel cross-tab sync state
```

Design invariants:

- **No locks held across `await`s** — wasm is single-threaded; a contended mutex would deadlock the event loop. Async methods lock → clone → drop → await.
- **Backend is internal** — users never see drivers or traits; the type they instantiate selects the backend at compile time.
- **Errors are strings at the JS boundary** — `Result<_, JsValue>` with human-readable messages.

## Development

```bash
# prerequisites: Rust (wasm32-unknown-unknown target), wasm-pack

cargo fmt --all
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo check --target wasm32-unknown-unknown
wasm-pack build --target bundler --release
```

CI runs exactly this gate on every push/PR to `main` and `dev`. Release tags (`v*`) trigger crates.io + npm publishing and a GitHub Release.

## License

MIT — see [LICENSE](./LICENSE). © 2026 Md. Ramjan Miah
