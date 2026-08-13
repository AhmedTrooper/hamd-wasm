# Getting started

```bash
npm install hamd-wasm
# or Cargo
# [dependencies] hamd-wasm = "0.1.0"
```

```ts
import { Local, Memory, IndexedDb } from 'hamd-wasm';
const s = new Local('myapp:');
s.set('user', { name: 'Alice' });
s.get('user'); // → {name:'Alice'}

const db = new IndexedDb();
await db.set('sess', { token: 'abc' });
```
Prefixes isolate: `new Local('a:')` and `new Local('b:')` never collide. SSR uses `Memory`.
