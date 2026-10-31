import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { overlayUrl, tipUrl } from "../src/tips.js";
import { SITE_URL } from "../src/site.js";

test("shared URLs always use the custom domain, independent of the page's host and query", () => {
  // These are navigation fixtures, never a deployed recipient or a real transaction.
  for (const href of [
    "https://squeekstage-live-stream-companio.imd.site/?demo=1#/setup",
    "https://example.org/ipfs/example/?obs=1&sound=0#/stage",
    "http://localhost:8080/preview/#/setup",
  ]) {
    globalThis.location = { href };
    assert.equal(new URL(overlayUrl()).origin, new URL(SITE_URL).origin);
    assert.equal(new URL(tipUrl()).origin, new URL(SITE_URL).origin);
    assert.equal(new URL(tipUrl()).search, "");
  }
  delete globalThis.location;
});

test("OBS share preserves every setting and query parameters precede the hash", () => {
  const settings = { streamer: "wallet-value-for-url-test", accent: "#5b7cfa", minTip: "2.5", demo: true, sound: false };
  const url = new URL(overlayUrl(settings));
  assert.equal(url.pathname, "/");
  assert.equal(url.hash, "#/stage");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    obs: "1", streamer: settings.streamer, accent: settings.accent, minTip: "2.5", demo: "1", sound: "0",
  });
  assert.match(url.href, /accent=%235b7cfa/);
  assert.ok(url.href.indexOf("?") < url.href.indexOf("#"));
});

test("tip links preserve recipient and accent without OBS or demo flags", () => {
  const url = new URL(tipUrl({ streamer: "wallet-value-for-url-test", accent: "#f2c230", demo: true, sound: false }));
  assert.equal(url.hash, "#/tip");
  assert.deepEqual(Object.fromEntries(url.searchParams), { streamer: "wallet-value-for-url-test", accent: "#f2c230" });
  assert.equal(new URL(overlayUrl({ minTip: 0, sound: true })).searchParams.get("minTip"), "0");
});

test("source and production metadata agree with the single site URL", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const built = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.equal(source, built);
  assert.match(built, /<link rel="canonical" href="https:\/\/squeekstage\.online\/"/);
  assert.match(built, /<meta property="og:url" content="https:\/\/squeekstage\.online\/"/);
  assert.match(built, /<meta property="og:image" content="https:\/\/squeekstage\.online\/assets\/social\.png"/);
  assert.equal((await readFile(new URL("../dist/CNAME", import.meta.url), "utf8")).trim(), new URL(SITE_URL).hostname);
  assert.ok(!(await readFile(new URL("../dist/assets/app.css", import.meta.url), "utf8")).includes("fonts.googleapis.com"));
  const png = await readFile(new URL("../dist/assets/social.png", import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
