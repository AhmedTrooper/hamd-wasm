# hamd-wasm

**Hamd — one API, five storages, encrypted, TTL-aware, binary-ready.** Rust → WebAssembly. Works anywhere JavaScript runs.

> Pick a type, get a backend. `new Local()` = `localStorage`. `new Session()` = `sessionStorage`. `new Cookies()` = `document.cookie`. `new Memory()` = in-memory. `new IndexedDb()` = `IndexedDB` (async). All share the same methods.

[![CI](https://github.com/AhmedTrooper/hamd-wasm/actions/workflows/ci.yml/badge.svg)](https://github.com/AhmedTrooper/hamd-wasm/actions) ![npm @ahmedtrooper/hamd-wasm](https://img.shields.io/npm/v/@ahmedtrooper/hamd-wasm?label=npm) ![crates.io](https://img.shields.io/crates/v/hamd-wasm) ![license MIT](https://img.shields.io/badge/license-MIT-black) ![FAANG 92%](https://img.shields.io/badge/FAANG-92%25-ready-0a7a42)

```ts
import { Local, IndexedDb } from '@ahmedtrooper/hamd-wasm';

const store = new Local({ prefix: 'myapp:' });
store.set('user', { name: 'Alice', id: 101 });
store.get('user'); // → { name: 'Alice', id: 101 }

const db = new IndexedDb();
await db.setBytes('avatar', new Uint8Array([0, 255, 42]));
await db.getBytes('avatar'); // → Uint8Array
```

---

## For non-developers — what is this?

- **Browser storage** is where a website saves small data on your device (login, cart, settings). Different places exist: `localStorage` (stays), `sessionStorage` (tab-only), `cookies` (sent to server), `IndexedDB` (big files).
- **Hamd** gives you **one simple way** to use any of them. Change `new Local()` to `new IndexedDb()` — your code stays the same.
- **Encryption** means saved data looks like gibberish in DevTools — readable only with your 32-byte key.
- **TTL** means “expire after 60 seconds” — good for OTPs, invites, temporary locks.
- **Binary** means you can save images/files as `Uint8Array`, not just text.
- **Sync** means if a user has two tabs open, a cart update in tab A appears in tab B.

---

## Install

**JavaScript / TypeScript (npm)**

```bash
npm install @ahmedtrooper/hamd-wasm
# docs site: npm --prefix web install && npm --prefix web run build
```

No Rust needed — npm ships `.wasm` + JS glue + `.d.ts`.

**Rust (crates.io)**

```toml
[dependencies]
hamd-wasm = "0.1.0"
```

**Build from source**

```bash
cargo fmt --all
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo check --target wasm32-unknown-unknown
wasm-pack build --target bundler --release --scope ahmedtrooper # pkg/ 188K wasm
```

---

## Choose a backend

| Type | Backed by | Sync / Async | Best for | Limit |
| --- | --- | --- | --- | --- |
| `new Local(options?)` | `window.localStorage` | sync | app data that survives restarts | ~5MB string (~3.6MB binary base64). Quota → purge expired retry |
| `new Session(options?)` | `window.sessionStorage` | sync | tab-only data | ~5MB |
| `new Cookies(options?)` | `document.cookie` | sync | server-readable tiny tokens | 4KB per cookie (`SameSite=Lax`, `Secure` on https) |
| `new Memory(options?)` | `HashMap` | sync | SSR, tests, fallback when `window` missing | unbounded |
| `new IndexedDb(prefix?)` | `IndexedDB` `hamd v1 kv` | **async** (`Promise`) | files, images, large data | disk ~50% (GBs) |

All take an optional `prefix` (`hamd:` default) to isolate: `new Local({ prefix: 'app:' })` and `new Local({ prefix: 'admin:' })` never collide, `clear()` only deletes its prefix.

```ts
const a = new Local({ prefix: 'app:' });
const b = new Local({ prefix: 'admin:' });
a.set('x', 1); b.set('x', 2);
a.clear(); // b still has 'x'
```

---

## Complete API — every method, no omission

Every type implements the same names. `IndexedDb` returns `Promise` for storage ops; constructors, `enableEncryption`/`createEncryptionKey`, `subscribe` stay sync.

### `new Type(options?)`

```ts
const s1 = new Local();            // prefix "hamd:"
const s2 = new Local({ prefix: 'myapp:' });    // custom
const s3 = new Session();      // also "hamd:"
```

* `prefix` if `null/undefined` → `"hamd:"`. Use per feature: `orders:`, `auth:`.

### `set(key, value, ttlMs?)` — save JSON

```ts
store.set('user', { name: 'Alice', age: 25 });
store.set('count', 42);
store.set('otp', '123456', 60_000); // TTL 60s → envelope {__val, __exp: Date.now()+60_000}
```

* `key: string` — must satisfy **validation** (applies to every `key` param): non-empty, `≤256` bytes, no `\0` `\n` `\r` → else `key must be non-empty` / `key too long: max 256 bytes` / `key contains invalid control characters`
* `value: any` — `JSON.stringify`'d; primitives, objects, arrays all OK
* `ttlMs?: number|null` — if given must be `finite && >0` else `ttlMs must be a positive finite number`
* Storage is `hamd:enc:v1:` + `hex(nonce||ciphertext)` if encryption is enabled, else JSON or TTL-envelope JSON

### `get(key)` — load JSON

```ts
store.get('user');   // → {name:'Alice'} or null if missing/expired
store.get('otp');    // → value or null after 60s (entry auto-removed)
```

* Lazy-eviction: expired `has/get` deletes the raw key then returns `null`
* Errors: `key` validation same as `set`; decryption `wrong key or corrupted data` if key mismatched

### `setBytes(key, bytes, ttlMs?)` / `getBytes(key)` — save binary

```ts
const bytes = new Uint8Array([0, 1, 255, 42]);
store.setBytes('avatar', bytes);           // sync backends: versioned base64 envelope + same TTL/encrypt
store.getBytes('avatar'); // → Uint8Array | undefined (null→undefined)

const db = new IndexedDb();
await db.setBytes('file', bytes, 60_000); // async, disk-backed, same envelope
await db.getBytes('file');                // → Uint8Array | undefined
```

* `bytes: Uint8Array` (`&[u8]` in Rust) — versioned base64 envelope `hamd:bin:v1`; string backends guard `b64_len>4_800_000 → bytes too large for string storage, use IndexedDb` (covers `Local/Session` 5MB → ~3.6MB binary). `Cookies` also hits its serialized-size guard first.
* `getBytes` returns `undefined` if missing/expired; throws `value is not binary data` if you call it on a `set`-saved JSON key

### `remove(key)` / `clear()` — delete

```ts
store.remove('user'); // validates key, broadcasts remove
store.clear();        // deletes only keys starting with this instance's prefix, broadcasts clear
```

* `clear` collects `raw_keys().filter(startsWith(prefix))` then `raw_remove` per key (IndexedDB batch single `Readwrite` txn)

### `has(key)` / `keys()` / `length()` — inspect

```ts
store.has('user'); // → boolean via !isNull(get)
store.keys();      // → string[] stripped of prefix  e.g. ['user','avatar']
store.length();    // → number counted under prefix
```

### `purgeExpired()` — proactively evict

```ts
store.set('short', 'tmp', 40);
await new Promise(r => setTimeout(r, 100));
store.get('short'); // → null
// or sweep all:
store.purgeExpired();
```

* Implemented as `for (k of stripPrefix(raw_keys)) get(k)` — triggers lazy expiry per key. `IndexedDb` async version `await`s each `get`.

### `mset(entries, ttlMs?)` / `mget(keys)` — bulk

```ts
store.mset({ a: 1, b: 2, c: 3 }, 5_000); // shared TTL
store.mget(['a','b','missing']); // → { a:1, b:2, missing: null } (sync) / Promise<object> (IndexedDb)
// validation: mset keys must be strings, mget keys must be strings + validate_key each; non-string → "mset keys must be strings"/"mget keys must be strings"
```

### `enableEncryption(key)` / `createEncryptionKey()` — AES-256-GCM

```ts
const s = new Local();
const key = s.createEncryptionKey(); // Uint8Array(32), also enables encryption for this instance

// bring your own
s.enableEncryption(my32Bytes); // throws "key must be exactly 32 bytes" if !=32

s.set('secret', { ssn: '000' });  // stored as versioned AES-GCM payload
s.get('secret'); // wrong key → "decryption failed: wrong key or corrupted data" / "hex decode: …"/"utf-8 decode: …"
s.setBytes('enc', new Uint8Array([1,2,3])); // also encrypted (encrypts the binary envelope)

// per-instance: enable right after new; keys zeroized on drop (ZeroizeOnDrop)
```

* Uses `aes-gcm` `Aes256Gcm` `getrandom` nonce per write; stored `hex` length `<28 → ciphertext too short`
* Client-side only — protects at-rest DevTools view, not live XSS with key in memory

### `subscribe(cb)` → `unsubscribe()` — cross-tab sync

```ts
const s = new Local({ prefix: 'app:' });
const off = s.subscribe((action, key) => {
  // action: "set" | "remove" | "clear",  key: string ("" for clear)
  console.log(action, key);
});
s.set('cart', [1,2,3]); // broadcasts {action:'set', prefix:'app:', key:'cart'} filtered by prefix
off(); // Closure::once_into_js → removes listener
```

* Channel `hamd-sync-{kind}` (`local/session/memory/cookies/indexeddb`) via `BroadcastChannel`; fallback for `local/session` on Safari via `localStorage __hamd_sync_{kind}` `storage` event with same `{action,prefix,key,ts}` and prefix filter. `unsubscribe` removes `message` or `storage` listener.

### IndexedDB async notes

```ts
const db = new IndexedDb('app:');
await db.set('k','v');  await db.get('k');  await db.has('k');
await db.keys(); await db.length(); await db.purgeExpired();
await db.mset({a:1});   await db.mget(['a']);
await db.setBytes('f', new Uint8Array([1])); await db.getBytes('f');
db.subscribe((a,k)=>{}); db.enableEncryption(key); db.createEncryptionKey();
```

* `IndexedDb` holds lazy `IdbDatabase` (`hamd v1 kv` store) with `cached_db`, `open_db` `onupgradeneeded`, `IDBRequest→Promise` self-cleaning (`onsuccess/onerror` cleared via `Rc<RefCell>`), batch deletes queued on single `Readwrite` txn before any `await`.
* Design invariant: no `Mutex` held across `await` — lock→clone→drop→await (`db().await`, `raw_set` etc.)

---

## Errors — what you will see

| Input | Error string |
| --- | --- |
| `key === ""` | `key must be non-empty` |
| `key.length >256` | `key too long: max 256 bytes` |
| `key` contains `\0`/`\n`/`\r` | `key contains invalid control characters` |
| `ttlMs` `NaN`, `Infinity`, `<=0` | `ttlMs must be a positive finite number` |
| `enableEncryption` `len!=32` | `key must be exactly 32 bytes` |
| `mset` key not string | `mset keys must be strings` |
| `mget` key not string | `mget keys must be strings` |
| `getBytes` on JSON value | `value is not binary data` |
| `get` with wrong key | `decryption failed: wrong key or corrupted data` or `hex decode: …` |
| `bytes` too big for string storage | `bytes too large for string storage, use IndexedDb` |
| `raw_set` oversize `Cookies` | `quota exceeded after evicting expired entries` (after `purgeExpired` retry) |
| `Cookies` no `HtmlDocument` | `no HtmlDocument` |

---

## Limits & quota

| Backend | Cap | Handling |
| --- | --- | --- |
| `Local/Session` | ~5MB (string, +33% base64 → ~3.6MB binary) | `QuotaExceededError/code22` detected → `purgeExpired` then retry once |
| `Cookies` | 4KB per cookie (`3900` guard) | `encode_uri_component`/`decode_uri_component` trim, `Secure` on `https:` |
| `Memory` | unbounded `HashMap` | no quota, SSR-safe |
| `IndexedDB` | disk ~50% (GBs) | async batch single txn, `QuotaExceeded` same retry |

---

## Installation details

```bash
npm install @ahmedtrooper/hamd-wasm # npm @ahmedtrooper/hamd-wasm@0.1.0 87K tgz 7 files
# Rust
# Cargo.toml authors = ["Md. Ramjan Miah <ramjan@example.com>"] homepage https://github.com/AhmedTrooper/hamd-wasm#readme exclude = ["pkg/","target/",".github/","web/"]
```

Built with `package.metadata.wasm-pack.profile.release wasm-opt -Oz --enable-bulk-memory/sign-ext/mutable-globals/nontrapping` + `profile.release opt-level z lto codegen-units1 panic abort strip`. `pkg/` is gitignored (`/.gitignore` `/pkg/`).

---

## Architecture (source truth)

```
src/lib.rs       impl_storage! Local/Session/Memory/Cookies sync + IndexedDb async (prefix, validate_key, encrypt, ttl, sync, bulk, bytes)
src/ops.rs       StorageOps raw_set/get/remove/keys + StorageError QuotaExceeded
src/web.rs       window Storage Local/Session, quota_error
src/cookie.rs    HtmlDocument.cookie encode/decode 3900 Secure
src/memory.rs    HashMap
src/idb.rs       open_db v1 kv, raw_set/get/raw_remove single txn, get_all_keys, request_promise (Rc<RefCell> handlers)
src/crypto.rs    Aes256Gcm 12B nonce hex, 28B min, zeroize
src/envelope.rs  wrap Object{__val,__exp:Date.now()+ttl} →stringify / unwrap Expired
src/sync.rs      BroadcastChannel hamd-sync-{kind} + storage fallback, prefix-filtered
tests/integration.rs 24 wasm-bindgen-test Chrome headless (TTL sleep, sync, encryption wrong-key, bytes, key validation)
web/             Vite 6 + Solid 1.9 docs site (supermodular routes: getting-started/storage/encryption/ttl/binary/sync/limits/api)
docs/            7 feature md files (single-source, mirrored here)
```

---

## Development & release

```bash
cargo fmt --all
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo check --target wasm32-unknown-unknown
cargo test --target wasm32-unknown-unknown --no-run
wasm-pack test --chrome --headless # 24 passed
wasm-pack build --target bundler --release --scope ahmedtrooper # pkg/ 188K wasm
cargo publish --dry-run # 25 files 99.5KiB
wasm-pack pack # @ahmedtrooper/hamd-wasm 0.1.0 87K
npm --prefix web run build # 20K js/5K css
```

CI `.github/workflows/ci.yml`: `fmt/clippy/check/wasm-pack build/test` + `audit (cargo-audit)` + `coverage (cargo-llvm-cov)`. Release `.github/workflows/release.yml`: `Validate` → `cargo publish` `${{ secrets.CARGO_REGISTRY_TOKEN }}` + `wasm-pack build --scope ahmedtrooper` → `npm publish --access public` `${{ secrets.NPM_TOKEN }}` → GitHub Release on `v*` (`VERSION=$(cargo metadata…); TAG=v$VERSION; git tag $TAG; git push origin $TAG`). `v0.1.0` → `crates.io hamd-wasm 0.1.0` live, `@ahmedtrooper/hamd-wasm 0.1.0` live (unscoped `hamd-wasm` blocked `hash-wasm` similarity).

## License

MIT — [LICENSE](./LICENSE) © 2026 Md. Ramjan Miah
