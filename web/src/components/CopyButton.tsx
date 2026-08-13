import { createSignal, Show, type Component } from "solid-js";

export interface CopyButtonProps {
  text: string;
}

export const CopyButton: Component<CopyButtonProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const [errored, setErrored] = createSignal(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(props.text);
      } else {
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
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setErrored(true);
      window.setTimeout(() => setErrored(false), 1500);
    }
  };

  return (
    <button
      class={`copy-btn ${copied() ? "copied" : ""} ${errored() ? "errored" : ""}`}
      onClick={copy}
      aria-label="Copy code to clipboard"
    >
      <Show
        when={copied()}
        fallback={
          <Show when={errored()} fallback={"Copy"}>
            Failed
          </Show>
        }
      >
        Copied
      </Show>
    </button>
  );
};