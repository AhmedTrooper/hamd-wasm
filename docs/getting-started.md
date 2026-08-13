# Getting started

```bash
npm install @ahmedtrooper/hamd-wasm
# or Cargo
# [dependencies] hamd-wasm = "0.1.0"
```

```ts
import { Local, Memory, IndexedDb } from '@ahmedtrooper/hamd-wasm';
const s = new Local('myapp:');
s.set('user', { name: 'Alice' });
s.get('user'); // → {name:'Alice'}

// The second argument optionally isolates IndexedDB from other applications.
const db = new IndexedDb({ prefix: 'myapp:', databaseName: 'myapp-storage' });
await db.set('sess', { token: 'abc' });
```
Prefixes isolate: `new Local('a:')` and `new Local('b:')` never collide. SSR uses `Memory`.
