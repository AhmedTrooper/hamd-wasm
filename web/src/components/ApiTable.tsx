import { For, type Component } from "solid-js";
import type { ApiColumn, ApiRow } from "../types";

export interface ApiTableProps {
  cols: ApiColumn[];
  rows: ApiRow[];
}

export const ApiTable: Component<ApiTableProps> = (props) => {
  return (
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <For each={props.cols}>
              {(c) => (
                <th style={c.width ? `width:${c.width}` : ""}>{c.label}</th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(r) => (
              <tr>
                <For each={props.cols}>
                  {(c) => <td>{r[c.key] as never}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};