import { Show, type Component } from "solid-js";
import { tokenize } from "../lib/syntax";
import { CopyButton } from "./CopyButton";
import type { CodeLang } from "../types";

export interface CodeBlockProps {
  code: string;
  lang?: CodeLang;
  label?: string;
  /** Default true. Pass `false` to suppress the copy button. */
  copy?: boolean;
}

export const CodeBlock: Component<CodeBlockProps> = (props) => {
  return (
    <div class="code-wrap">
      <Show when={props.label}>
        <div class="code-label">{props.label}</div>
      </Show>
      <pre class={`code ${props.lang ?? "ts"}`}>
        <code
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={tokenize(props.code, props.lang ?? "ts")}
        />
      </pre>
      <Show when={props.copy !== false}>
        <CopyButton text={props.code} />
      </Show>
    </div>
  );
};