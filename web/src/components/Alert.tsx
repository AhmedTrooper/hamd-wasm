import { Show, type Component, type JSX } from "solid-js";

export type AlertKind = "default" | "note" | "tip" | "warn" | "danger";

export interface AlertProps {
  kind?: AlertKind;
  title?: string;
  children?: JSX.Element;
}

const ICONS: Record<AlertKind, string> = {
  default: "•",
  note: "i",
  tip: "✓",
  warn: "!",
  danger: "×",
};

export const Alert: Component<AlertProps> = (props) => {
  const kind = (): AlertKind => props.kind ?? "default";
  return (
    <div class={`alert alert-${kind()}`}>
      <span class="alert-icon">{ICONS[kind()]}</span>
      <div class="alert-body">
        <Show when={props.title}>
          <div class="alert-title">{props.title}</div>
        </Show>
        <div>{props.children}</div>
      </div>
    </div>
  );
};