# TTL — time to live

```ts
s.set('otp','123',60_000); // {__val,__exp:Date.now()+60_000} via Object→stringify
s.get('otp'); // expired→ auto-remove→ null
s.purgeExpired(); // sweep
```
Validation : `ttlMs` must be `finite>0` else `ttlMs must be a positive finite number`. Tested via `sleep_ms 100` 24 tests.
