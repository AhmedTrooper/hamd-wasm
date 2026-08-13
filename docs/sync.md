# Sync — cross-tab

`SyncState` `BroadcastChannel hamd-sync-{kind}` + fallback `localStorage __hamd_sync_{kind}` for `local/session` on Safari.

```ts
const off = new Local('app:').subscribe((a,k)=>console.log(a,k));
new Local('app:').set('cart',[]); // other tab/instance receives set→cart
off(); // removeEventListener message/storage
```
Filtered by `prefix`; `clear` broadcasts `action:clear`.
