import type { NavGroup } from "../types";

export const NAV: NavGroup[] = [
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