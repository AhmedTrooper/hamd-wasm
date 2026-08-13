# hamd-docs

Production docs for `hamd-wasm`. Vite + SolidJS in `web/`.

```bash
npm ci --prefix web
npm run --prefix web build   # -> web/dist
npm run --prefix web dev     # -> http://localhost:5173
```

Deploy: set Vercel **Root Directory** to `web` (or serve `web/dist` on GitHub Pages).
Theme persisted via `hamd-wasm` `Local("hamd-docs_")` when installed (`npm i @ahmedtooper_npm/hamd-wasm`), otherwise `localStorage`.
