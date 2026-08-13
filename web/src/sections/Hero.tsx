import type { Component } from "solid-js";
import {
  KeyIcon,
  ClockIcon,
  BytesIcon,
  SyncIcon,
  ArrowRight,
} from "../components/icons";

export interface HeroProps {
  onGetStarted: () => void;
  onViewExamples: () => void;
}

export const Hero: Component<HeroProps> = (props) => {
  return (
    <section class="hero">
      <div class="hero-eyebrow">
        <span class="dot" /> One API · Five backends · Encrypted
      </div>
      <h1>
        Browser storage that <span>just works</span> on every backend.
      </h1>
      <p class="lead">
        <strong>hamd-wasm</strong> is a single typed interface over{" "}
        <code>localStorage</code>, <code>sessionStorage</code>,{" "}
        <code>document.cookie</code>, an in-memory <code>Map</code>, and{" "}
        <code>IndexedDB</code>. Written in Rust, compiled to WebAssembly. Pick a
        class, get a backend. Change one word, swap backends.
      </p>
      <div class="hero-cta">
        <button class="btn btn-default" onClick={props.onGetStarted}>
          Get started <ArrowRight />
        </button>
        <button class="btn btn-outline" onClick={props.onViewExamples}>
          View examples
        </button>
        <a
          class="btn btn-ghost"
          href="https://github.com/AhmedTrooper/hamd-wasm"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </div>
      <div class="hero-grid">
        <div class="card">
          <div class="hc-icon">
            <KeyIcon />
          </div>
          <div class="hc-title">AES-256-GCM</div>
          <div class="hc-desc">
            Per-instance 32-byte key. Fresh nonce per write. Encrypted at rest in
            DevTools.
          </div>
        </div>
        <div class="card">
          <div class="hc-icon">
            <ClockIcon />
          </div>
          <div class="hc-title">TTL & lazy expiry</div>
          <div class="hc-desc">
            Per-entry expiration. <code>get()</code> auto-evicts.{" "}
            <code>purgeExpired()</code> sweeps.
          </div>
        </div>
        <div class="card">
          <div class="hc-icon">
            <BytesIcon />
          </div>
          <div class="hc-title">Binary ready</div>
          <div class="hc-desc">
            <code>setBytes</code> / <code>getBytes</code> with{" "}
            <code>Uint8Array</code>. IDB has no size cap.
          </div>
        </div>
        <div class="card">
          <div class="hc-icon">
            <SyncIcon />
          </div>
          <div class="hc-title">Cross-tab sync</div>
          <div class="hc-desc">
            <code>subscribe()</code> via <code>BroadcastChannel</code> with{" "}
            <code>storage</code> fallback.
          </div>
        </div>
      </div>
    </section>
  );
};