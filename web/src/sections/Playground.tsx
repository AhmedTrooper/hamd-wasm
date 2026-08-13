import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { Tabs } from "../components/Tabs";
import { PLAYGROUND_SAMPLES } from "../data/samples";

export const Playground: Component = () => {
  return (
    <Section id="playground" title="Code samples">
      <p class="section-lead">
        Real, copy-pasteable snippets against the package's actual exported API.
        Pick a tab, copy the code, run it in your project.
      </p>
      <Tabs samples={PLAYGROUND_SAMPLES} />
    </Section>
  );
};