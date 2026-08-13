# Encryption — AES-256-GCM per instance

```ts
const s = new Local();
const key = s.generateKey(); // 32B, enables
s.set('secret', { ssn: '000' }); // hex(nonce||ciphertext)
s.get('secret'); // decrypt, wrong key → "decryption failed: wrong key or corrupted data"
s.setBytes('bin', new Uint8Array([1,2,3])); // also encrypted
```
Keys live in `EncryptionKey` `ZeroizeOnDrop`; not persisted; store yourself (server).
