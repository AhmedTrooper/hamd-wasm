import { createSignal, createEffect, onMount, onCleanup, For, Show, createMemo } from "solid-js";
import "./App.css";

/* All API examples on this page are written against the actual exported surface
   of @ahmedtooper_npm/hamd-wasm:
     export { Local, Session, Cookies, Memory, IndexedDb }
   No package is imported at runtime — these docs are pure documentation. */

/* =========================================================
   Tokenizer (minimal syntax highlight)
   ========================================================= */

function tokenize(src, lang = "ts") {
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let out = escape(src);
  out = out.replace(
    /(`[^`]*`|'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g,
    '<span class="tk-str">$1</span>'
  );
  out = out.replace(/(^|\n)(\s*)(\/\/[^\n]*)/g, '$1$2<span class="tk-com">$3</span>');
  out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="tk-com">${m}</span>`);
  out = out.replace(/\b(\d[\d_]*)\b/g, '<span class="tk-num">$1</span>');
  if (lang === "ts" || lang === "js") {
    const kws =
      "import|from|export|default|new|const|let|var|return|await|async|function|if|else|throw|class|extends|implements|interface|type|true|false|null|undefined|void|number|string|boolean|Promise|Uint8Array|of|in";
    out = out.replace(
      new RegExp(`\\b(${kws})\\b`, "g"),
      '<span class="tk-kw">$1</span>'
    );
  }
  if (lang === "bash") {
    out = out.replace(
      /\b(npm|npx|node|cargo|wasm-pack|install|run|build|publish)\b/g,
      '<span class="tk-kw">$1</span>'
    );
  }
  return out;
}

/* =========================================================
   Primitives
   ========================================================= */

function CodeBlock(props) {
  return (
    <div class="code-wrap">
      <Show when={props.label}>
        <div class="code-label">{props.label}</div>
      </Show>
      <pre class={`code ${props.lang ?? "ts"}`}>
        <code innerHTML={tokenize(props.code, props.lang ?? "ts")} />
      </pre>
      <Show when={props.copy !== false}>
        <CopyButton text={props.code} />
      </Show>
    </div>
  );
}

function CopyButton(props) {
  const [copied, setCopied] = createSignal(false);
  const [errored, setErrored] = createSignal(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(props.text);
      } else {
        // Fallback for non-secure contexts (older browsers, http://)
        const ta = document.createElement("textarea");
        ta.value = props.text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setErrored(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setErrored(true);
      setTimeout(() => setErrored(false), 1500);
    }
  };

  return (
    <button
      class={`copy-btn ${copied() ? "copied" : ""} ${errored() ? "errored" : ""}`}
      onClick={copy}
      aria-label="Copy code to clipboard"
    >
      <Show when={copied()} fallback={<Show when={errored()} fallback="Copy">Failed</Show>}>
        Copied
      </Show>
    </button>
  );
}

function Alert(props) {
  return (
    <div class={`alert alert-${props.kind ?? "default"}`}>
      <span class="alert-icon">{iconFor(props.kind)}</span>
      <div class="alert-body">
        <Show when={props.title}>
          <div class="alert-title">{props.title}</div>
        </Show>
        <div>{props.children}</div>
      </div>
    </div>
  );
}

function iconFor(kind) {
  if (kind === "warn") return "!";
  if (kind === "tip") return "✓";
  if (kind === "danger") return "×";
  if (kind === "note") return "i";
  return "•";
}

/* =========================================================
   Sidebar
   ========================================================= */

const NAV = [
  {
    section: "Introduction",
    items: [
      { id: "intro", label: "What is hamd-wasm?" },
      { id: "install", label: "Installation" },
      { id: "backends", label: "Choosing a backend" },
    ],
  },
  {
    section: "Core API",
    items: [
      { id: "constructor", label: "Constructor & prefix" },
      { id: "set-get", label: "set / get / has / remove" },
      { id: "mset-mget", label: "mset / mget" },
      { id: "inspect", label: "keys / length / clear" },
      { id: "ttl", label: "TTL & purgeExpired" },
      { id: "dispose", label: "Symbol.dispose" },
    ],
  },
  {
    section: "Features",
    items: [
      { id: "binary", label: "Binary (Uint8Array)" },
      { id: "encryption", label: "AES-256-GCM encryption" },
      { id: "sync", label: "Cross-tab sync" },
      { id: "errors", label: "Errors & validation" },
      { id: "limits", label: "Limits & quota" },
    ],
  },
  {
    section: "Examples",
    items: [{ id: "playground", label: "Code samples" }],
  },
];

/* =========================================================
   Tabs (playground)
   ========================================================= */

function Tabs(props) {
  const [active, setActive] = createSignal(props.samples[0].id);
  const current = createMemo(
    () => props.samples.find((s) => s.id === active()) ?? props.samples[0]
  );

  return (
    <div class="tabs">
      <div class="tabs-list" role="tablist">
        <For each={props.samples}>
          {(s) => (
            <button
              role="tab"
              class={`tab-trigger ${active() === s.id ? "active" : ""}`}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          )}
        </For>
      </div>
      <div class="tab-content">
        <div class="tab-header">
          <span class="tab-header-title">{current().label}</span>
          <CopyButton text={current().code} />
        </div>
        <pre class="tab-body">
          <code innerHTML={tokenize(current().code, "ts")} />
        </pre>
        <Show when={current().note}>
          <div class="tab-footer">{current().note}</div>
        </Show>
      </div>
    </div>
  );
}

/* =========================================================
   Table helper
   ========================================================= */

function ApiTable(props) {
  return (
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <For each={props.cols}>
              {(c) => <th style={c.width ? `width:${c.width}` : ""}>{c.label}</th>}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(r) => (
              <tr>
                <For each={props.cols}>
                  {(c) => <td>{r[c.key]}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   Section
   ========================================================= */

function Anchor(props) {
  return <span id={props.id} />;
}

function Section(props) {
  return (
    <section class="section">
      <Anchor id={props.id} />
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

/* =========================================================
   Icons
   ========================================================= */

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M17 12v3M21 12v2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BytesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10v4M11 9v6M15 10v4M19 9v6" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" />
      <path d="M16 4l4 1-1 4M8 20l-4-1 1-4" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* =========================================================
   App
   ========================================================= */

export default function App() {
  const [route, setRoute] = createSignal("intro");
  const [theme, setTheme] = createSignal("dark");
  const [navOpen, setNavOpen] = createSignal(false);

  const samples = [
    {
      id: "basic",
      label: "Basic",
      code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
store.set("user", { id: 42, name: "Alice" });
console.log(store.get("user"));
// { id: 42, name: "Alice" }`,
    },
    {
      id: "ttl",
      label: "TTL",
      code: `import { Session } from "@ahmedtooper_npm/hamd-wasm";

const wizard = new Session("wizard:");
wizard.set("step1", { name: "email" });
wizard.set("otp", "123456", 60_000); // 60s

setTimeout(() => {
  console.log(wizard.get("otp")); // null — lazy-evicted
}, 61_000);`,
    },
    {
      id: "binary",
      label: "Binary",
      code: `import { IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

const db = new IndexedDb("app:");
const avatar = new Uint8Array([0, 1, 255, 42]);
await db.setBytes("avatar", avatar);
console.log(await db.getBytes("avatar"));
// Uint8Array(4) [0, 1, 255, 42]`,
    },
    {
      id: "encrypt",
      label: "Encrypt",
      code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
const key = store.generateKey();   // Uint8Array(32)
store.enableEncryption(key);

store.set("secret", { ssn: "000-00-0000" });
console.log(store.get("secret"));
// { ssn: "000-00-0000" }`,
      note: "Stored value in DevTools is hex(nonce || ciphertext+tag).",
    },
    {
      id: "sync",
      label: "Sync",
      code: `import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");
const off = store.subscribe((action, key) => {
  // action: "set" | "remove" | "clear"
  // key:    string ("" when action === "clear")
  console.log("remote", action, key);
});

store.set("cart", [1, 2, 3]); // broadcasts to other tabs
off();`,
    },
    {
      id: "bulk",
      label: "Bulk",
      code: `import { Memory } from "@ahmedtooper_npm/hamd-wasm";

const cache = new Memory("cache:");
cache.mset({ a: 1, b: 2, c: 3 }, 5_000);
console.log(cache.mget(["a", "b", "missing"]));
// { a: 1, b: 2, missing: null }`,
    },
  ];

  /* Package-manager install snippets — used by the install section tabs */
  const installSamples = [
    {
      id: "npm",
      label: "npm",
      code: `npm install @ahmedtooper_npm/hamd-wasm`,
      note: "Node 18+. Adds to package.json + package-lock.json.",
    },
    {
      id: "yarn",
      label: "yarn",
      code: `yarn add @ahmedtooper_npm/hamd-wasm`,
      note: "Yarn 1.x classic and Yarn berry both accept `add`.",
    },
    {
      id: "pnpm",
      label: "pnpm",
      code: `pnpm add @ahmedtooper_npm/hamd-wasm`,
      note: "Fastest install on large monorepos.",
    },
    {
      id: "bun",
      label: "bun",
      code: `bun add @ahmedtooper_npm/hamd-wasm`,
      note: "Bun 1.0+. Adds to package.json + bun.lock.",
    },
  ];

  /* Shared suppression flag for scroll-tracking. Mutated by `go()` and
     read by the IntersectionObserver registered in onMount(). Using a
     plain object so both closures see the same value across renders. */
  const scrollState = { suppress: false };

  /* Body scroll lock + Escape-to-close for the off-canvas drawer.
     createEffect tracks `navOpen` so the flag is always in sync. */
  createEffect(() => {
    const isOpen = navOpen();
    if (typeof document === "undefined") return;
    document.body.classList.toggle("nav-locked", isOpen);
  });
  const onKeydown = (e) => {
    if (e.key === "Escape" && navOpen()) setNavOpen(false);
  };
  onMount(() => {
    window.addEventListener("keydown", onKeydown);
  });
  onCleanup(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("nav-locked");
    }
    window.removeEventListener("keydown", onKeydown);
  });

  const applyTheme = (t) => document.documentElement.setAttribute("data-theme", t);

  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("hamd-docs:theme", next);
    } catch {}
  };

  const go = (id) => {
    setRoute(id);
    setNavOpen(false);
    // Briefly suppress scroll-tracker so smooth-scroll doesn't flicker the
    // active id through intermediate sections.
    scrollState.suppress = true;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      history.replaceState(null, "", id === "intro" ? " " : "#" + id);
    } catch {}
    setTimeout(() => {
      scrollState.suppress = false;
    }, 700);
  };

  onMount(() => {
    /* Theme */
    try {
      const t = localStorage.getItem("hamd-docs:theme");
      if (t === "light" || t === "dark") setTheme(t);
      else localStorage.setItem("hamd-docs:theme", theme());
    } catch {}
    applyTheme(theme());

    /* ---------- Scroll tracking ----------
       Observe every section anchor. Whichever section is currently crossing
       the top ~35% of the viewport becomes active. URL hash is kept in sync
       without pushing history entries. */

    const sections = Array.from(document.querySelectorAll(".main .section[id]"));
    const allIds = sections.map((s) => s.id).concat(["intro"]);

    const setActive = (id) => {
      if (!id || id === route()) return;
      setRoute(id);
      if (!scrollState.suppress) {
        try {
          history.replaceState(null, "", id === "intro" ? " " : "#" + id);
        } catch {}
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollState.suppress) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        // Trigger band: just below the sticky topbar down to ~65% from bottom.
        rootMargin: "-72px 0px -65% 0px",
        threshold: [0, 0.1, 0.5, 1],
      }
    );
    sections.forEach((s) => observer.observe(s));

    // Edge cases the IntersectionObserver can miss.
    const onScroll = () => {
      if (scrollState.suppress) return;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && sections.length) {
        setActive(sections[sections.length - 1].id);
        return;
      }
      if (window.scrollY < 80) setActive("intro");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Initial hash (deep-link) → scroll there, suppress briefly.
    const applyHash = () => {
      const hash = (location.hash || "").replace(/^#/, "");
      if (hash && allIds.includes(hash)) {
        scrollState.suppress = true;
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ block: "start" });
        setRoute(hash);
        setTimeout(() => {
          scrollState.suppress = false;
        }, 800);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);

    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", applyHash);
    });
  });

  return (
    <div class={`layout ${navOpen() ? "nav-open" : ""}`}>
      <header class="topbar">
        <button
          class="nav-toggle"
          onClick={() => setNavOpen(!navOpen())}
          aria-label="Toggle navigation"
          aria-expanded={navOpen()}
        >
          <Show when={!navOpen()} fallback={<CloseIcon />}>
            <MenuIcon />
          </Show>
        </button>
        <a class="brand" href="#intro" onClick={(e) => { e.preventDefault(); go("intro"); }}>
          <div class="brand-mark">
            <StackIcon />
          </div>
          <div class="brand-text">
            <span class="brand-title">hamd-wasm</span>
            <span class="brand-sub">Unified encrypted browser storage</span>
          </div>
          <span class="brand-version">
            v{typeof __HAMD_VERSION__ !== "undefined" ? __HAMD_VERSION__ : "0.1.0"}
          </span>
        </a>
        <nav class="topnav">
          <a
            class="topnav-link"
            href="https://github.com/AhmedTrooper/hamd-wasm"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            class="topnav-link"
            href="https://www.npmjs.com/package/@ahmedtooper_npm/hamd-wasm"
            target="_blank"
            rel="noreferrer"
          >
            npm
          </a>
          <button class="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <Show when={theme() === "dark"} fallback={<SunIcon />}>
              <MoonIcon />
            </Show>
          </button>
        </nav>
      </header>

      <div class="sidebar-backdrop" onClick={() => setNavOpen(false)} />

      <aside class="sidebar">
        <For each={NAV}>
          {(group) => (
            <div class="nav-group">
              <div class="nav-label">{group.section}</div>
              <For each={group.items}>
                {(it) => (
                  <button
                    class={`nav-item ${route() === it.id ? "active" : ""}`}
                    onClick={() => go(it.id)}
                  >
                    {it.label}
                  </button>
                )}
              </For>
            </div>
          )}
        </For>
        <div class="sidebar-foot">
          <div class="foot-card">
            <div class="foot-card-label">Install</div>
            <div class="foot-cmd-wrap">
              <code class="foot-cmd">npm i @ahmedtooper_npm/hamd-wasm</code>
              <CopyButton text="npm i @ahmedtooper_npm/hamd-wasm" />
            </div>
          </div>
          <div class="foot-tip">
            Theme persisted via the browser&apos;s <code>localStorage</code>.
          </div>
        </div>
      </aside>

      <main class="main">
        <section class="hero">
          <div class="hero-eyebrow">
            <span class="dot" /> One API · Five backends · Encrypted
          </div>
          <h1>
            Browser storage that <span>just works</span> on every backend.
          </h1>
          <p class="lead">
            <strong>hamd-wasm</strong> is a single typed interface over{" "}
            <code>localStorage</code>, <code>sessionStorage</code>,{" "}
            <code>document.cookie</code>, an in-memory <code>Map</code>, and{" "}
            <code>IndexedDB</code>. Written in Rust, compiled to WebAssembly.
            Pick a class, get a backend. Change one word, swap backends.
          </p>
          <div class="hero-cta">
            <button class="btn btn-default" onClick={() => go("install")}>
              Get started <ArrowRight />
            </button>
            <button class="btn btn-outline" onClick={() => go("playground")}>
              View examples
            </button>
            <a
              class="btn btn-ghost"
              href="https://github.com/AhmedTrooper/hamd-wasm"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          </div>
          <div class="hero-grid">
            <div class="card">
              <div class="hc-icon">
                <KeyIcon />
              </div>
              <div class="hc-title">AES-256-GCM</div>
              <div class="hc-desc">
                Per-instance 32-byte key. Fresh nonce per write. Encrypted at rest in DevTools.
              </div>
            </div>
            <div class="card">
              <div class="hc-icon">
                <ClockIcon />
              </div>
              <div class="hc-title">TTL & lazy expiry</div>
              <div class="hc-desc">
                Per-entry expiration. <code>get()</code> auto-evicts. <code>purgeExpired()</code> sweeps.
              </div>
            </div>
            <div class="card">
              <div class="hc-icon">
                <BytesIcon />
              </div>
              <div class="hc-title">Binary ready</div>
              <div class="hc-desc">
                <code>setBytes</code> / <code>getBytes</code> with <code>Uint8Array</code>. IDB has no size cap.
              </div>
            </div>
            <div class="card">
              <div class="hc-icon">
                <SyncIcon />
              </div>
              <div class="hc-title">Cross-tab sync</div>
              <div class="hc-desc">
                <code>subscribe()</code> via <code>BroadcastChannel</code> with <code>storage</code> fallback.
              </div>
            </div>
          </div>
        </section>

        <Section id="intro" title="What is hamd-wasm?">
          <p class="section-lead">
            Every browser gives you storage. None of them give you{" "}
            <em>one</em> API. <code>localStorage</code> is sync but tiny.{" "}
            <code>IndexedDB</code> is huge but async. <code>document.cookie</code>{" "}
            goes to the server. They have different shapes, different errors,
            different lifetimes. Switching backends means rewriting code.
          </p>
          <p>
            <strong>hamd-wasm</strong> gives you five classes with the{" "}
            <em>exact same method set</em>:
          </p>
          <CodeBlock
            code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

// Sync — backed by window.localStorage
const a = new Local("app:");
a.set("user", { id: 42, name: "Alice" });
a.get("user"); // { id: 42, name: "Alice" }

// Async — backed by IndexedDB. Same method names.
const b = new IndexedDb("app:");
await b.set("user", { id: 42, name: "Alice" });
await b.get("user");`}
          />
          <Alert kind="tip" title="Drop-in migration">
            Change <code>new Local("app:")</code> to <code>new IndexedDb("app:")</code>{" "}
            and add <code>await</code>. That&apos;s the whole migration.
          </Alert>
        </Section>

        <Section id="install" title="Installation">
          <p class="section-lead">
            Published from the repo via <code>wasm-pack</code>. The package
            ships <code>hamd_wasm_bg.wasm</code>, the JS glue, and a{" "}
            <code>.d.ts</code> — no Rust toolchain required at install time.
          </p>

          <h3>Install</h3>
          <p>
            Pick your package manager. Each command installs the same package
            and its wasm artifact.
          </p>
          <Tabs samples={installSamples} />

          <h3>Quick import</h3>
          <p>Five classes, one import:</p>
          <CodeBlock
            code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";`}
          />

          <h3>TypeScript</h3>
          <p>
            Types are included. The package exports five classes — use them
            directly:
          </p>
          <CodeBlock
            code={`import { Local, Session, Cookies, Memory, IndexedDb } from "@ahmedtooper_npm/hamd-wasm";

const store: Local = new Local("app:");
store.set("k", { v: 1 });`}
          />
          <Alert kind="note">
            The five classes all implement the same interface (modulo{" "}
            <code>Promise</code> for <code>IndexedDb</code>). There is no default
            export and no <code>init()</code> call — wasm is loaded by the
            module itself.
          </Alert>
        </Section>

        <Section id="backends" title="Choosing a backend">
          <p class="section-lead">
            All five classes share one method set. The difference is what they
            sit on top of, and whether operations are sync or async.
          </p>
          <ApiTable
            cols={[
              { key: "cls", label: "Class" },
              { key: "backend", label: "Backend" },
              { key: "sync", label: "Sync?" },
              { key: "best", label: "Best for" },
              { key: "limit", label: "Limit" },
            ]}
            rows={[
              {
                cls: <code>Local</code>,
                backend: <code>window.localStorage</code>,
                sync: "sync",
                best: "App data that survives reloads",
                limit: "~5 MB string (~3.6 MB binary)",
              },
              {
                cls: <code>Session</code>,
                backend: <code>window.sessionStorage</code>,
                sync: "sync",
                best: "Tab-only data (wizards, drafts)",
                limit: "~5 MB",
              },
              {
                cls: <code>Cookies</code>,
                backend: <code>document.cookie</code>,
                sync: "sync",
                best: "Server-readable tokens, theme prefs",
                limit: "4 KB / cookie (3900 B guard)",
              },
              {
                cls: <code>Memory</code>,
                backend: (
                  <>
                    In-process <code>Map</code>
                  </>
                ),
                sync: "sync",
                best: "SSR, tests, when window is missing",
                limit: "RAM",
              },
              {
                cls: <code>IndexedDb</code>,
                backend: <code>IndexedDB</code>,
                sync: <strong>async</strong>,
                best: "Files, images, large data",
                limit: "Disk (~50% of free space)",
              },
            ]}
          />
          <p>
            Pick by persistence + size: <code>Local</code> for everything small
            and durable, <code>IndexedDb</code> when you cross the ~5 MB line or
            need binary blobs, <code>Session</code> when you want tab-only
            isolation, <code>Cookies</code> when the server must see the value,
            <code>Memory</code> for SSR and tests.
          </p>
        </Section>

        <Section id="constructor" title="Constructor & prefix">
          <p class="section-lead">
            All five classes take an optional namespace prefix. Prefixes
            isolate keys — two stores with different prefixes never collide,
            and <code>clear()</code> only deletes keys that start with the
            store&apos;s prefix.
          </p>
          <CodeBlock
            code={`new Local();            // prefix "hamd:"  (default)
new Local("app:");       // custom
new Local(null as any);  // also "hamd:"
new Session("wizard:");
new Cookies("prefs:");
new Memory();            // SSR-safe (no window required)
new IndexedDb("app:");   // async ops; same prefix semantics`}
          />
          <CodeBlock
            code={`const a = new Local("app:");
const b = new Local("admin:");
a.set("x", 1);
b.set("x", 2);
a.clear(); // only deletes app:x
b.get("x"); // 2`}
          />
          <Alert kind="tip">
            Use prefixes to namespace per feature: <code>orders:</code>,{" "}
            <code>auth:</code>, <code>cache:</code>. The default <code>hamd:</code>{" "}
            is fine for prototypes; switch to a project prefix before shipping.
          </Alert>
        </Section>

        <Section id="set-get" title="set / get / has / remove">
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">set(key, value, ttl_ms?)</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "JSON-encodes value and stores it. ttl_ms in ms (positive finite number).",
              },
              {
                sig: <span class="sig">get(key)</span>,
                ret: <code>any</code>,
                desc: "Returns the stored value, null if missing, undefined for missing binary. Expired keys auto-evict and return null.",
              },
              {
                sig: <span class="sig">has(key)</span>,
                ret: <code>boolean</code>,
                desc: "True if the key exists and is not expired.",
              },
              {
                sig: <span class="sig">remove(key)</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "Deletes a single key. Broadcasts a remove event to subscribers.",
              },
            ]}
          />
          <CodeBlock
            code={`import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");

store.set("user",   { id: 42, name: "Alice" });
store.set("count",  42);
store.set("active", true);

store.get("user");   // { id: 42, name: "Alice" }
store.get("ghost");  // null
store.has("user");   // true
store.has("ghost");  // false
store.remove("user");
store.has("user");   // false`}
          />
          <Alert kind="note">
            <code>get()</code> on a JSON value returns <code>null</code> when the
            key is missing or expired. <code>getBytes()</code> returns{" "}
            <code>undefined</code> in the same situation. (See Binary below.)
          </Alert>
        </Section>

        <Section id="mset-mget" title="mset / mget">
          <p class="section-lead">
            Bulk variants. Both validate every key the same way as{" "}
            <code>set</code> / <code>get</code>.
          </p>
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">mset(entries, ttl_ms?)</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "entries is a plain object { key: value, ... }. A single TTL applies to all.",
              },
              {
                sig: <span class="sig">mget(keys)</span>,
                ret: <code>{`{ [k]: value | null }`}</code>,
                desc: "Returns an object keyed by the input keys; missing/expired entries map to null.",
              },
            ]}
          />
          <CodeBlock
            code={`store.mset({ a: 1, b: 2, c: 3 }, 5_000); // 5-second TTL on all

store.mget(["a", "b", "missing"]);
// {
//   a: 1,
//   b: 2,
//   missing: null
// }`}
          />
          <Alert kind="danger" title="Validation">
            Every key is validated. Non-string keys throw{" "}
            <code>&quot;mset keys must be strings&quot;</code> or{" "}
            <code>&quot;mget keys must be strings&quot;</code>.
          </Alert>
        </Section>

        <Section id="inspect" title="keys / length / clear">
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">keys()</span>,
                ret: (
                  <>
                    <code>string[]</code> | <code>Promise&lt;string[]&gt;</code>
                  </>
                ),
                desc: "Keys under this store's prefix, with the prefix stripped.",
              },
              {
                sig: <span class="sig">length()</span>,
                ret: (
                  <>
                    <code>number</code> | <code>Promise&lt;number&gt;</code>
                  </>
                ),
                desc: "Count of keys under this store's prefix.",
              },
              {
                sig: <span class="sig">clear()</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "Deletes only keys that start with this store's prefix. Broadcasts a clear event.",
              },
            ]}
          />
          <CodeBlock
            code={`const store = new Local("app:");
store.set("a", 1);
store.set("b", 2);
store.set("c", 3);

store.keys();   // ["a", "b", "c"]
store.length(); // 3

store.clear();
store.length(); // 0`}
          />
          <p>
            <code>clear()</code> is scope-safe: it walks every key under the
            store&apos;s prefix and removes only those. Stores with different
            prefixes never interfere.
          </p>
        </Section>

        <Section id="ttl" title="TTL & purgeExpired">
          <p class="section-lead">
            Pass a positive finite number of milliseconds as the third argument
            to <code>set</code> or <code>mset</code>. Entries are stored with an
            envelope <code>{`{ __val, __exp }`}</code> that records their expiry
            time.
          </p>
          <CodeBlock
            code={`store.set("otp", "123456", 60_000);  // expires in 60s
store.set("token", jwt, 15 * 60_000);          // 15 minutes

// Lazy expiry:
store.get("otp");   // returns the value, deletes the underlying entry
// ... 60s later ...
store.get("otp");   // null`}
          />
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">purgeExpired()</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "Walks every key under the prefix and forces a get(); expired entries are removed.",
              },
            ]}
          />
          <CodeBlock
            code={`// Proactively sweep all TTL entries
await store.purgeExpired();`}
          />
          <Alert kind="tip">
            You rarely need <code>purgeExpired()</code> — expired entries are
            removed the first time anyone calls <code>get()</code> on them.
            Use it when you want a clean storage area (e.g. after a logout).
          </Alert>
        </Section>

        <Section id="dispose" title="Symbol.dispose">
          <p class="section-lead">
            All five classes implement <code>Symbol.dispose</code>, so you can
            use the explicit resource management proposal (<code>using</code>)
            to ensure cleanup.
          </p>
          <CodeBlock
            code={`{
  using store = new Local("app:");
  store.set("temp", data);
  // ...
} // free() / dispose runs here`}
          />
          <p>
            This is most useful with <code>IndexedDb</code> in long-lived
            processes to release the WASM-side handle.
          </p>
        </Section>

        <Section id="binary" title="Binary (Uint8Array)">
          <p class="section-lead">
            For raw bytes — images, files, blobs — use{" "}
            <code>setBytes</code> / <code>getBytes</code>.
          </p>
          <CodeBlock
            code={`const file = new Uint8Array([0, 1, 255, 42]);

store.setBytes("avatar", file);
store.getBytes("avatar"); // Uint8Array | undefined

// With TTL:
store.setBytes("snapshot", bigBuffer, 60_000);`}
          />
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">setBytes(key, bytes, ttl_ms?)</span>,
                ret: (
                  <>
                    <code>void</code> | <code>Promise&lt;void&gt;</code>
                  </>
                ),
                desc: "Bytes are wrapped in a { __bin, data } envelope and reuse TTL + encryption.",
              },
              {
                sig: <span class="sig">getBytes(key)</span>,
                ret: (
                  <>
                    <code>Uint8Array | undefined</code> | <code>Promise&lt;...&gt;</code>
                  </>
                ),
                desc: "Returns undefined if missing/expired, throws if the key was set with set() (not a binary value).",
              },
            ]}
          />
          <Alert kind="danger">
            String-backed stores (<code>Local</code>, <code>Session</code>,{" "}
            <code>Cookies</code>) enforce a <strong>4.8 MB binary guard</strong>{" "}
            after base64 encoding. If you hit it, you&apos;ll see{" "}
            <code>&quot;bytes too large for string storage, use IndexedDb&quot;</code>.
            Switch to <code>IndexedDb</code> for files.
          </Alert>
        </Section>

        <Section id="encryption" title="AES-256-GCM encryption">
          <p class="section-lead">
            Enable per-instance encryption with a 32-byte key. After enabling,
            every <code>set</code> / <code>setBytes</code> is encrypted before
            it hits the underlying backend; every <code>get</code> /{" "}
            <code>getBytes</code> decrypts on the way out.
          </p>
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">generateKey()</span>,
                ret: <code>Uint8Array (32 bytes)</code>,
                desc: "Returns a fresh 32-byte key. Does NOT enable encryption on its own.",
              },
              {
                sig: <span class="sig">enableEncryption(key)</span>,
                ret: <code>void</code>,
                desc: "Takes a Uint8Array of exactly 32 bytes; throws otherwise. From that point on, writes are encrypted.",
              },
            ]}
          />
          <CodeBlock
            code={`import { Local } from "@ahmedtooper_npm/hamd-wasm";

const store = new Local("app:");

// 1. Generate and enable in one go:
const key = store.generateKey();        // Uint8Array(32)
store.enableEncryption(key);

store.set("secret", { ssn: "000-00-0000" });

// In DevTools you'll see:
//   "hamd:app:secret" = "a1b2c3d4…"   (hex of nonce||ciphertext+tag)
// but store.get("secret") returns { ssn: "000-00-0000" }.

// 2. Bring your own key:
const myKey = crypto.getRandomValues(new Uint8Array(32));
store.enableEncryption(myKey);

// 3. Wrong key → throws:
// store.enableEncryption(new Uint8Array(16));
//   // "key must be exactly 32 bytes"`}
          />
          <Alert kind="warn">
            Encryption protects data <strong>at rest</strong> (what DevTools
            shows). It does <strong>not</strong> protect against a live XSS that
            can read your key while the page is running. Don&apos;t ship a key
            with the page.
          </Alert>
          <h3>Storage format</h3>
          <p>Encrypted values are stored as <code>hex(nonce || ciphertext+tag)</code>:</p>
          <ul class="bullets">
            <li>12-byte random nonce per write</li>
            <li>AES-256-GCM authenticated ciphertext (16-byte tag)</li>
            <li>Minimum stored length: 28 bytes (else <code>&quot;ciphertext too short&quot;</code>)</li>
            <li>Keys are zeroized when the instance is dropped</li>
          </ul>
        </Section>

        <Section id="sync" title="Cross-tab sync">
          <p class="section-lead">
            <code>subscribe(cb)</code> lets one tab react to writes from
            another. The callback receives <code>(action, key)</code>:
          </p>
          <ApiTable
            cols={[
              { key: "sig", label: "Method" },
              { key: "ret", label: "Returns" },
              { key: "desc", label: "Description" },
            ]}
            rows={[
              {
                sig: <span class="sig">subscribe(cb)</span>,
                ret: <code>() =&gt; void (unsubscribe)</code>,
                desc: 'cb(action: "set" | "remove" | "clear", key: string). key is "" for clear.',
              },
            ]}
          />
          <CodeBlock
            code={`const store = new Local("app:");

const unsubscribe = store.subscribe((action, key) => {
  if (action === "clear") {
    console.log("another tab cleared", store);
    return;
  }
  console.log("remote", action, key);
  if (action === "set" && key === "cart") {
    refreshCart();
  }
});

store.set("cart", [1, 2, 3]); // broadcasts to other tabs

// Later:
unsubscribe();`}
          />
          <Alert kind="note">
            Transport is <code>BroadcastChannel(&quot;hamd-sync-{`{kind}`}&quot;)</code> with
            a <code>localStorage</code> + <code>storage</code>-event fallback
            for Safari (Local / Session only). Messages are filtered by prefix,
            so two stores with different prefixes won&apos;t see each other&apos;s
            events.
          </Alert>
        </Section>

        <Section id="errors" title="Errors & validation">
          <p class="section-lead">
            Validation is strict and runs on every method. Keys must satisfy:
          </p>
          <ul class="bullets">
            <li>Non-empty</li>
            <li>≤ 256 bytes</li>
            <li>
              No <code>\0</code>, <code>\n</code>, or <code>\r</code> characters
            </li>
          </ul>
          <ApiTable
            cols={[
              { key: "cond", label: "Condition" },
              { key: "err", label: "Error" },
            ]}
            rows={[
              {
                cond: (
                  <>
                    <code>key === &quot;&quot;</code>
                  </>
                ),
                err: <code>key must be non-empty</code>,
              },
              {
                cond: (
                  <>
                    <code>key.length &gt; 256</code>
                  </>
                ),
                err: <code>key too long: max 256 bytes</code>,
              },
              {
                cond: (
                  <>
                    <code>key</code> contains <code>\0</code> / <code>\n</code> / <code>\r</code>
                  </>
                ),
                err: <code>key contains invalid control characters</code>,
              },
              {
                cond: (
                  <>
                    <code>ttl_ms</code> is NaN / Infinity / ≤ 0
                  </>
                ),
                err: <code>ttlMs must be a positive finite number</code>,
              },
              {
                cond: (
                  <>
                    <code>enableEncryption</code> with len ≠ 32
                  </>
                ),
                err: <code>key must be exactly 32 bytes</code>,
              },
              {
                cond: (
                  <>
                    <code>mset</code> / <code>mget</code> non-string key
                  </>
                ),
                err: (
                  <>
                    <code>mset keys must be strings</code> /{" "}
                    <code>mget keys must be strings</code>
                  </>
                ),
              },
              {
                cond: (
                  <>
                    <code>getBytes</code> on a JSON value
                  </>
                ),
                err: <code>value is not binary data</code>,
              },
              {
                cond: (
                  <>
                    <code>get</code> with wrong encryption key
                  </>
                ),
                err: <code>decryption failed: wrong key or corrupted data</code>,
              },
              {
                cond: <>Bytes &gt; 4.8 MB on a string backend</>,
                err: <code>bytes too large for string storage, use IndexedDb</code>,
              },
              {
                cond: (
                  <>
                    <code>Cookies</code> with no <code>document</code>
                  </>
                ),
                err: <code>no HtmlDocument</code>,
              },
            ]}
          />
        </Section>

        <Section id="limits" title="Limits & quota">
          <ApiTable
            cols={[
              { key: "back", label: "Backend" },
              { key: "cap", label: "Cap" },
              { key: "handle", label: "Handling" },
            ]}
            rows={[
              {
                back: (
                  <>
                    <code>Local</code> / <code>Session</code>
                  </>
                ),
                cap: "~5 MB string (~3.6 MB binary)",
                handle: (
                  <>
                    On <code>QuotaExceededError</code> / code 22:{" "}
                    <code>purgeExpired()</code> → retry once
                  </>
                ),
              },
              {
                back: <code>Cookies</code>,
                cap: "4 KB / cookie (3900 B guard)",
                handle: (
                  <>
                    <code>encodeURIComponent</code> / <code>decodeURIComponent</code>,{" "}
                    <code>Secure</code> on <code>https:</code>
                  </>
                ),
              },
              {
                back: <code>Memory</code>,
                cap: (
                  <>
                    unbounded <code>Map</code>
                  </>
                ),
                handle: "No quota; SSR-safe (no window needed)",
              },
              {
                back: <code>IndexedDb</code>,
                cap: "Disk ~50% of free space (GBs)",
                handle: (
                  <>
                    Async batched in a single <code>readwrite</code> txn; same
                    quota-retry strategy
                  </>
                ),
              },
            ]}
          />
        </Section>

        <Section id="playground" title="Code samples">
          <p class="section-lead">
            Real, copy-pasteable snippets against the package&apos;s actual
            exported API. Pick a tab, copy the code, run it in your project.
          </p>
          <Tabs samples={samples} />
        </Section>

        <footer class="doc-foot">
          <div>
            <strong>hamd-wasm</strong> · MIT · © 2026 Md. Ramjan Miah
          </div>
          <div class="foot-links">
            <a href="https://github.com/AhmedTrooper/hamd-wasm" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@ahmedtooper_npm/hamd-wasm"
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
            <a href="https://crates.io/crates/hamd-wasm" target="_blank" rel="noreferrer">
              crates.io
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}