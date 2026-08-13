import { For, type Component } from "solid-js";
import { CopyButton } from "../components/CopyButton";
import { NAV } from "../data/nav";

export interface SidebarProps {
  activeId: () => string;
  onNavigate: (id: string) => void;
}

export const Sidebar: Component<SidebarProps> = (props) => {
  return (
    <aside class="sidebar">
      <For each={NAV}>
        {(group) => (
          <div class="nav-group">
            <div class="nav-label">{group.section}</div>
            <For each={group.items}>
              {(it) => (
                <button
                  class={`nav-item ${props.activeId() === it.id ? "active" : ""}`}
                  onClick={() => props.onNavigate(it.id)}
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
      </div>
    </aside>
  );
};