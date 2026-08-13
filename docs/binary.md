# Binary — Uint8Array

String storages (`Local/Session`) keep `String` only → binary → `base64` `{"__bin":true,"data":"<b64>"}` → same `envelope/encrypt`; guard `>4_800_000→use IndexedDb`.

```ts
s.setBytes('avatar', new Uint8Array([0,255,42]));
s.getBytes('avatar'); // → Uint8Array

const db = new IndexedDb();
await db.setBytes('file', bytes, 60_000); // TTL+encrypt, disk-backed
```

`IndexedDB` could be native `ArrayBuffer` zero-copy (future).
