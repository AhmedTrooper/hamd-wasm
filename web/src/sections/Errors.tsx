import type { Component } from "solid-js";
import { Section } from "../components/Section";
import { ApiTable } from "../components/ApiTable";

export const Errors: Component = () => {
  return (
    <Section id="errors" title="Errors & validation">
      <p class="section-lead">
        Validation is strict and runs on every method. Keys must satisfy:
      </p>
      <ul class="bullets">
        <li>Non-empty</li>
        <li>≤ 256 bytes</li>
        <li>
          No <code>\0</code>, <code>\n</code>, or <code>\r</code> characters
        </li>
      </ul>
      <ApiTable
        cols={[
          { key: "cond", label: "Condition" },
          { key: "err", label: "Error" },
        ]}
        rows={[
          {
            cond: (
              <>
                <code>key === &quot;&quot;</code>
              </>
            ),
            err: <code>key must be non-empty</code>,
          },
          {
            cond: (
              <>
                <code>key.length &gt; 256</code>
              </>
            ),
            err: <code>key too long: max 256 bytes</code>,
          },
          {
            cond: (
              <>
                <code>key</code> contains <code>\0</code> / <code>\n</code> /{" "}
                <code>\r</code>
              </>
            ),
            err: <code>key contains invalid control characters</code>,
          },
          {
            cond: (
              <>
                <code>ttl_ms</code> is NaN / Infinity / ≤ 0
              </>
            ),
            err: <code>ttlMs must be a positive finite number</code>,
          },
          {
            cond: (
              <>
                <code>enableEncryption</code> with len ≠ 32
              </>
            ),
            err: <code>key must be exactly 32 bytes</code>,
          },
          {
            cond: (
              <>
                <code>mset</code> / <code>mget</code> non-string key
              </>
            ),
            err: (
              <>
                <code>mset keys must be strings</code> /{" "}
                <code>mget keys must be strings</code>
              </>
            ),
          },
          {
            cond: (
              <>
                <code>getBytes</code> on a JSON value
              </>
            ),
            err: <code>value is not binary data</code>,
          },
          {
            cond: (
              <>
                <code>get</code> with wrong encryption key
              </>
            ),
            err: <code>decryption failed: wrong key or corrupted data</code>,
          },
          { cond: <>Bytes &gt; 4.8 MB on a string backend</>, err: <code>bytes too large for string storage, use IndexedDb</code> },
          {
            cond: (
              <>
                <code>Cookies</code> with no <code>document</code>
              </>
            ),
            err: <code>no HtmlDocument</code>,
          },
        ]}
      />
    </Section>
  );
};