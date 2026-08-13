/* Shared TypeScript types for the hamd-wasm docs site. */

import type { JSX, Component } from "solid-js";

export type Theme = "light" | "dark";

export type CodeLang = "ts" | "js" | "bash";

export interface CodeSample {
  id: string;
  label: string;
  code: string;
  note?: string;
}

export interface NavItem {
  id: string;
  label: string;
}

export interface NavGroup {
  section: string;
  items: NavItem[];
}

export interface ApiColumn {
  key: string;
  label: string;
  width?: string;
}

export interface ApiRow {
  [key: string]: JSX.Element | string | number | boolean | null | undefined;
}

export interface ScrollState {
  suppress: boolean;
}

export type Children = JSX.Element;

export type IconComponent = Component;