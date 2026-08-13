# API — 5 types, one surface

All `Local/Session/Memory/Cookies` sync; `IndexedDb` same names `Promise`.

| Method | Returns | Notes |
|---|---|---|
| `new Type(prefix?)` | instance | default `hamd:` |
| `set(k,v,ttl?)` | void/Promise | `JSON.stringify`, `ttlMs` `finite>0` else error |
| `setBytes(k,Uint8Array,ttl?)` | void/Promise | `__bin` base64, `4.8M` guard → use IndexedDb |
| `get(k)` | any\|null | lazy TTL evict |
| `getBytes(k)` | Uint8Array\|undefined | null→undefined, non-binary→error |
| `remove(k)`/`clear()`/`has(k)`/`keys()`/`length()`/`purgeExpired()` | - | prefix-scoped |
| `enableEncryption(key:32B)`/`generateKey()->32B` | - | per-instance, `zeroize` |
| `subscribe(cb:(action,key)=>void)->unsubscribe` | Function | per-kind `hamd-sync-{kind}` + `storage` fallback for local/session |
| `mset(obj,ttl?)`/`mget(keys)->object` | - | keys validated `256`/`\0` |
