import type { Component, JSX } from "solid-js";

export interface SectionProps {
  id: string;
  title: string;
  children?: JSX.Element;
}

const Anchor: Component<{ id: string }> = (props) => {
  return <span id={props.id} />;
};

export const Section: Component<SectionProps> = (props) => {
  return (
    <section class="section">
      <Anchor id={props.id} />
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
};