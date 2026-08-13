/// <reference types="vite/client" />

declare const __HAMD_VERSION__: string;

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}