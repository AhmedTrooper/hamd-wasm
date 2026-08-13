import { createSignal, createMemo, For, Show, type Component } from "solid-js";
import { tokenize } from "../lib/syntax";
import { CopyButton } from "./CopyButton";
import type { CodeSample } from "../types";

export interface TabsProps {
  samples: CodeSample[];
}

export const Tabs: Component<TabsProps> = (props) => {
  const [active, setActive] = createSignal(props.samples[0]?.id ?? "");
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
      <Show when={current()}>
        {(c) => (
          <div class="tab-content">
            <div class="tab-header">
              <span class="tab-header-title">{c().label}</span>
              <CopyButton text={c().code} />
            </div>
            <pre class="tab-body">
              <code
                // eslint-disable-next-line solid/no-innerhtml
                innerHTML={tokenize(c().code, "ts")}
              />
            </pre>
            <Show when={c().note}>
              <div class="tab-footer">{c().note}</div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
};