# hamd-wasm Progress

## Architecture

Single API, type-based storage selection via macro-generated `#[wasm_bindgen]` types.
Each type (Local, Session, Memory, Cookies) shares identical methods.
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
- [x] All checks pass: `cargo check`, `cargo fmt`, `cargo clippy` (zero warnings, `-D warnings`)
- [x] CI workflow: fmt, clippy, check, wasm-pack build on push/PR to main/dev
- [x] Release workflow: validate → publish crates.io + npm → GitHub Release on `v*` tags

## TODO

- [ ] IndexedDB backend (async, needs wasm-bindgen-futures)
- [ ] TTL (time-to-live) support with auto-eviction on read
- [ ] Cross-tab sync via BroadcastChannel API
- [ ] Bulk operations: mget, mset
- [ ] Quota exceeded error recovery with auto-evict of expired entries
- [ ] wasm-pack build + npm packaging
- [ ] Integration tests (wasm-bindgen-test)
- [ ] README with usage examples
- [ ] Publish to crates.io and npm
