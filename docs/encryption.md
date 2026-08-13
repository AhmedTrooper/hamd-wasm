# Encryption — AES-256-GCM per instance

Encryption is opt-in. A new store starts unencrypted, and `createEncryptionKey()` creates
a new random key each time it is called. Save that key in your own key-management
flow and pass the same bytes to `enableEncryption()` on every later page load.
If the key is lost or replaced, existing encrypted values cannot be decrypted.

```ts
const s = new Local();
const key = s.createEncryptionKey(); // 32B, enables; persist this exact key
s.set('secret', { ssn: '000' }); // hex(nonce||ciphertext)
s.get('secret'); // decrypt, wrong key → "decryption failed: wrong key or corrupted data"
s.setBytes('bin', new Uint8Array([1,2,3])); // also encrypted
```
Keys live only in the current store instance and are zeroized when it is dropped;
Hamd never persists or transmits them. Do not put a long-lived encryption key in
public frontend source or a `NEXT_PUBLIC_*` variable. For sensitive data, consider
server-side encryption or a key derived from user-provided secret material.

`generateKey()` remains as a compatibility alias, but do not call either method on
every page load: that would create a different key and make old values unreadable.
