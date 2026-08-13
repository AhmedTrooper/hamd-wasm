/* Minimal syntax highlighter for the docs.
   Returns HTML-safe string with <span class="tk-*"> wrappers. */

import type { CodeLang } from "../types";

const KEYWORDS_TS =
  "import|from|export|default|new|const|let|var|return|await|async|function|if|else|throw|class|extends|implements|interface|type|true|false|null|undefined|void|number|string|boolean|Promise|Uint8Array|of|in";
const KEYWORDS_BASH =
  "npm|npx|node|cargo|wasm-pack|install|run|build|publish";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function tokenize(src: string, lang: CodeLang = "ts"): string {
  let out = escape(src);

  // strings
  out = out.replace(
    /(`[^`]*`|'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g,
    '<span class="tk-str">$1</span>'
  );

  // line comments
  out = out.replace(
    /(^|\n)(\s*)(\/\/[^\n]*)/g,
    '$1$2<span class="tk-com">$3</span>'
  );

  // block comments
  out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="tk-com">${m}</span>`);

  // numbers
  out = out.replace(/\b(\d[\d_]*)\b/g, '<span class="tk-num">$1</span>');

  // keywords
  if (lang === "ts" || lang === "js") {
    out = out.replace(
      new RegExp(`\\b(${KEYWORDS_TS})\\b`, "g"),
      '<span class="tk-kw">$1</span>'
    );
  } else if (lang === "bash") {
    out = out.replace(
      new RegExp(`\\b(${KEYWORDS_BASH})\\b`, "g"),
      '<span class="tk-kw">$1</span>'
    );
  }

  return out;
}