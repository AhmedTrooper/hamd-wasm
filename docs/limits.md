# Limits

| Backend | Cap | Handling |
|---|---|---|
| Local/Session | ~5MB string (+33% b64 → ~3.6MB binary) | `QuotaExceededError/code22` → `purgeExpired` retry once |
| Cookies | 4KB (`3900` guard) | `encode_uri`, `Secure` on `https`, `SameSite=Lax` |
| Memory | unbounded | not counted as quota |
| IndexedDB | disk ~50% | async batch single txn |
Keys: `>0, ≤256, no \0\n\r` else error.
