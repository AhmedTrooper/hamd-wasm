# hamd-wasm Progress

## Architecture

Single API, type-based storage selection via macro-generated `#[wasm_bindgen]` types.
Each type (Local, Session, Memory, Cookies) shares identical sync methods.
IndexedDb shares the same method names but async (Promise-returning), since IndexedDB is async.
Internal `StorageOps` trait abstracts raw backend operations.
All state wrapped in `Arc<Mutex<…>>` (parking_lot) for thread safety across Web Workers.

## Completed

- [x] Project scaffolding: Cargo.toml, .gitignore, lib target, release profile
- [x] `ops.rs` — `StorageOps` trait (raw_set, raw_get, raw_remove, raw_keys)
- [x] `crypto.rs` — AES-256-GCM encryption/decryption, zeroize key wrapper, getrandom nonce
- [x] `web.rs` — LocalStorage + SessionStorage backend (web_sys::Storage)
- [x] `memory.rs` — HashMap-backed in-memory backend (SSR/testing)
- [x] `cookie.rs` — Cookie backend (HtmlDocument.cookie)
- [x] `lib.rs` — `impl_storage!` macro generating Local, Session, Memory, Cookies types
- [x] `idb.rs` — async IndexedDB backend: lazy DB open (v1, `kv` store), IDBRequest→Promise
      with self-cleaning handlers, batch deletes in one transaction; no lock held across awaits
- [x] `lib.rs` — `IndexedDb` type with async set/get/remove/clear/has/keys/length
- [x] `envelope.rs` — TTL: `set(key, value, ttlMs?)` wraps payload in `{__val,__exp}` envelope;
      `get`/`has` lazy-evict expired entries, `purgeExpired()` on all types
- [x] `sync.rs` — cross-tab sync: per-kind BroadcastChannel, `subscribe(cb)` returns an
      unsubscribe fn; set/remove/clear broadcast `{action,prefix,key}` filtered by prefix
- [x] All checks pass: `cargo check`, `cargo fmt`, `cargo clippy` (zero warnings, `-D warnings`)
- [x] CI workflow: fmt, clippy, check, wasm-pack build on push/PR to main/dev
- [x] Release workflow: validate → publish crates.io + npm → GitHub Release on `v*` tags

## TODO

- [ ] Bulk operations: mget, mset
- [ ] Quota exceeded error recovery with auto-evict of expired entries
- [ ] wasm-pack build + npm packaging
- [ ] Integration tests (wasm-bindgen-test)
- [ ] README with usage examples
- [ ] Publish to crates.io and npm
