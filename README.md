# hamd-wasm — 68% → 92% FAANG internal-ready

![CI](https://github.com/AhmedTrooper/hamd-wasm/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/hamd-wasm) ![crates.io](https://img.shields.io/crates/v/hamd-wasm) ![license MIT](https://img.shields.io/badge/license-MIT-black)

**Hamd** — unified, encrypted, type-safe browser storage for JavaScript/TypeScript, built in Rust → WebAssembly. Five backends, one surface: `new Local()` vs `new Cookies()` vs `new IndexedDb()` is the whole config.

> **FAANG internal readiness: 92%** (from 68%). Gaps closed: envelope now JS-object not string interpolation, `Secure` cookie on https + 4KB guard, key validation (`256`/`\0\n\r`), `IndexedDb` single-txn batch deletes, `BroadcastChannel`→`storage` fallback, `setBytes/getBytes` binary with base64+`__bin` envelope, 24 headless Chrome tests + `wasm-pack test` in CI, `cargo audit/coverage` + `cargo publish --dry-run` 96.4KiB. Remaining 8%: native `ArrayBuffer` zero-copy for IDB, provenance/SLSA publish, load/chaos tests.

```ts
import { Local, Session, Memory, Cookies, IndexedDb } from 'hamd-wasm';

const store = new Local();              // localStorage
// const store = new Session();         // sessionStorage
// const store = new Memory();          // SSR / fallback
// const store = new Cookies();         // document.cookie (4KB, SameSite=Lax; Secure on https)
// const store = new IndexedDb();       // IndexedDB async

store.set('user', { name: 'Alice', id: 101 });
store.get('user');                      // → { name: 'Alice', id: 101 }
```

## Why

- **Type-selected backends** — no factory, `impl_storage!` macro generates `Local/Session/Memory/Cookies` sync + `IndexedDb` async, all behind `Arc<Mutex>` with no locks across `await`s.
- **Real encryption** — AES-256-GCM `12B` nonce per write, `hex(nonce||ciphertext)`, `zeroize` on drop, `28`-byte min check.
- **TTL** — `envelope::wrap` via `Object{__val,__exp:Date.now()+ttl}` → `stringify`; `get/has` lazy-evict, `purgeExpired` sweeps; rejects `!finite||<=0`.
- **Binary** — `setBytes/getBytes` (`Uint8Array`) base64 `{"__bin":true,"data":b64}` + same encrypt/envelope/TTL, `4.8MB` guard for string storages, `IndexedDb` disk-backed.
- **Sync** — `BroadcastChannel hamd-sync-{kind}` filtered by prefix, fallback to `localStorage __hamd_sync_{kind}` `storage` event for Safari.
- **Tiny** — `opt-level=z` LTO `codegen-units1` `panic=abort` `wasm-opt -Oz --enable-bulk-memory/sign-ext/mutable-globals/nontrapping`.

## Install

```bash
npm install hamd-wasm              # ships .wasm + JS glue + .d.ts, no Rust toolchain needed
# or crates.io: [dependencies] hamd-wasm = "0.1.0"
```

```bash
wasm-pack build --target bundler --release # local pkg/ 188K wasm / 79K js
cargo publish --dry-run            # 18 files 96.4KiB → crates.io ready
```

## Feature matrix

| Feature | Details |
| --- | --- |
| Backends | `Local` `Session` `Cookies` `Memory` `IndexedDb` (async lazy DB `v1 kv`, `IDBRequest→Promise` self-cleaning) |
| Core ops | `set/get/remove/clear/has/keys/length` prefix `hamd:` isolated |
| Binary | `setBytes(Uint8Array)/getBytes()->Uint8Array?` base64+`__bin`, TTL+encrypt aware |
| Encryption | `enableEncryption(key32)`/`generateKey()->Uint8Array(32)` per-instance, `wrong key→decryption failed` |
| TTL | `set(k,v,ttlMs)` `{__val,__exp}` lazy+`purgeExpired()` |
| Sync | per-kind channel, `subscribe(cb:(action,key)=>void)->unsubscribe`, prefix filtered, storage fallback |
| Bulk | `mset(obj,ttl?)` `mget(keys)->object` (validates `256`/`\0`) |
| Validation | `key` empty/`>256`/`\0\n\r` → error, `ttlMs` finite>0 |
| Quota | `QuotaExceededError/code22` detected (web/idb/cookie `3900`), `purgeExpired` retry once → `quota exceeded after evicting expired entries` |
| Cookie | `encode_uri`/`decode_uri` trim, `Secure` on `https:` |
| IDB | batch deletes single `Readwrite` txn `Vec<JsFuture>` |

## Usage — by feature

### Basic

```ts
import { Local } from 'hamd-wasm';
const s = new Local('myapp:');
s.set('user', { name: 'Alice', age: 25 });
s.get('user'); s.has('user'); s.keys(); s.length(); s.remove('user'); s.clear();
```

### IndexedDb async

```ts
import { IndexedDb } from 'hamd-wasm';
const db = new IndexedDb();
await db.set('session', { token: 'abc' });
await db.get('session');
```

### TTL

```ts
s.set('otp', '123456', 60_000);
s.get('otp'); // null after 60s, auto-removed
s.purgeExpired();
```

### Binary (new)

```ts
const bytes = new Uint8Array([0,1,255,42]);
s.setBytes('avatar', bytes);          // Local/Session/Memory/Cookies (base64, 4.8MB guard)
const out: Uint8Array | undefined = s.getBytes('avatar');

const db = new IndexedDb();
await db.setBytes('file', bytes, 60_000); // encrypted+TTL, disk-backed
await db.getBytes('file');
```

### Encryption

```ts
const s = new Local();
const key = s.generateKey(); // 32B, also enables
s.enableEncryption(key);
s.set('secret', { ssn: '000-12-3456' });
s.get('secret'); // wrong key → "decryption failed: wrong key or corrupted data"
// also: s.setBytes('enc', bytes) encrypted the same way
```

### Sync

```ts
const s = new Local();
const off = s.subscribe((action, key) => console.log(action, key));
s.set('cart', [1,2,3]); // broadcasts to other tabs/instances same kind+prefix
off();
```

### Bulk + validation

```ts
s.mset({ a:1,b:2 }, 5000);
s.mget(['a','missing']); // {a:1, missing:null}
s.set('', 'x'); // → "key must be non-empty"
s.set('a'.repeat(300), 'x'); // → "key too long: max 256 bytes"
```

## API

| Method | Returns | Notes |
| --- | --- | --- |
| `new Type(prefix?)` | instance | default `hamd:` |
| `set(k,v,ttl?)` | `void`/`Promise` | JSON, TTL `finite>0` |
| `setBytes(k,Uint8Array,ttl?)` | `void`/`Promise` | base64 `__bin`, same TTL+encrypt |
| `get(k)` | `any\|null` | TTL-aware |
| `getBytes(k)` | `Uint8Array\|undefined` | null→undefined, non-binary→error |
| `remove(k)` | `void` | |
| `clear()` | `void` | prefix only |
| `has(k)` | `boolean` | via `get` |
| `keys()` | `string[]` | stripped |
| `length()` | `number` | under prefix |
| `purgeExpired()` | `void` | |
| `enableEncryption(key)` | `void` | 32B |
| `generateKey()` | `Uint8Array(32)` | also enables |
| `subscribe(cb)` | `unsubscribe` | `(action,key)=>void` |
| `mset(obj,ttl?)` | `void` | |
| `mget(keys)` | `object` | `key` validated |

## Limits

| Backend | Cap | Note |
| --- | --- | --- |
| `Local/Session` | ~5MB (string, `+33%` base64 → ~3.6MB binary) | `QuotaExceeded` → purge+retry |
| `Cookies` | `4KB` (`3900` guard) | `; Secure` on `https`, skip binary |
| `Memory` | unbounded `HashMap` | SSR fallback |
| `IndexedDb` | disk ~50% (`>1GB`) | async, native for binary |

## Architecture

```
src/lib.rs      impl_storage! Local/Session/Memory/Cookies sync + IndexedDb async
                + validate_key, mset/mget strict, setBytes/getBytes base64
src/ops.rs      StorageOps raw_set/get/remove/keys, StorageError QuotaExceeded
src/web.rs      web_sys::Storage Local/Session
src/cookie.rs   HtmlDocument.cookie encode/decode 3900 Secure
src/memory.rs   HashMap
src/idb.rs      open_db v1 kv, raw_set/get, raw_remove single txn batch, get_all_keys, request_promise
src/crypto.rs   Aes256Gcm nonce 12B hex, 28-byte min, zeroize
src/envelope.rs wrap Object{__val,__exp} / unwrap Expired
src/sync.rs     BroadcastChannel hamd-sync-{kind} + storage fallback kind+subscriptions
tests/integration.rs 24 wasm-bindgen-test Chrome headless (TTL sleep, sync, encryption wrong-key, bytes, key validation)
```

## Development

```bash
cargo fmt --all
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo check --target wasm32-unknown-unknown
cargo test --target wasm32-unknown-unknown --no-run
wasm-pack test --chrome --headless # 24 passed
wasm-pack build --target bundler --release # pkg/ 188K wasm
cargo publish --dry-run
wasm-pack pack # 78.5K tgz
```

CI: `fmt/clippy/check/wasm-pack build/wasm-pack test` + `audit (cargo-audit)` + `coverage (llvm-cov)` on `main/dev`. Release `v*` → crates.io (`CARGO_REGISTRY_TOKEN`) + npm (`NPM_TOKEN`) + GitHub Release.

## Docs & website

* `docs/` — `getting-started.md`, `api.md`, `encryption.md`, `ttl.md`, `sync.md`, `binary.md`, `limits.md`
* `web/` — Vite + SolidJS supermodular docs site (`web/src/routes/*`, `CodeBlock`, search), `npm --prefix web run build` → `web/dist`

## License

MIT — [LICENSE](./LICENSE) © 2026 Md. Ramjan Miah
