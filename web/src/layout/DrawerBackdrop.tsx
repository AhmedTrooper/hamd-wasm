import type { Component } from "solid-js";

export interface DrawerBackdropProps {
  onClick: () => void;
}

export const DrawerBackdrop: Component<DrawerBackdropProps> = (props) => {
  return <div class="sidebar-backdrop" onClick={props.onClick} />;
};