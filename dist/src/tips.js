// Settings + tip feed. Everything lives in the browser; no server, no account.

import { getIncomingTransfers } from "./chain.js";
import { SITE_URL } from "./site.js";

const KEY = "squeekstage:v1";
const DEFAULTS = {
  streamer: "", // address that receives tips (usually the streamer's own wallet)
  accent: "#f2c230",
  minTip: "1", // SQK, alerts below this are ignored
  sound: true,
  demo: false,
};

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    saved = {};
  }
  const merged = { ...DEFAULTS, ...saved };
  const url = new URLSearchParams(location.search);
  for (const k of ["streamer", "accent", "minTip", "demo"]) {
    if (url.has(k)) merged[k] = url.get(k);
  }
  if (url.has("sound")) merged.sound = url.get("sound") !== "0";
  merged.demo = [true, "1", "true", "yes"].includes(merged.demo);
  return merged;
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {object} ShareSettings
 * @property {string} [streamer]
 * @property {string} [accent]
 * @property {number|string} [minTip]
 * @property {boolean} [demo]
 * @property {boolean} [sound]
 */

/** @param {ShareSettings} [settings] */
export function overlayUrl({ streamer, accent, minTip, demo, sound } = {}) {
  const u = new URL(SITE_URL);
  u.hash = "#/stage";
  u.search = "";
  u.searchParams.set("obs", "1");
  if (streamer) u.searchParams.set("streamer", streamer);
  if (accent) u.searchParams.set("accent", accent);
  if (minTip != null) u.searchParams.set("minTip", String(minTip));
  if (demo) u.searchParams.set("demo", "1");
  if (sound === false) u.searchParams.set("sound", "0");
  return u.toString();
}

/** @param {ShareSettings} [settings] */
export function tipUrl({ streamer, accent } = {}) {
  const u = new URL(SITE_URL);
  u.hash = "#/tip";
  u.search = "";
  if (streamer) u.searchParams.set("streamer", streamer);
  if (accent) u.searchParams.set("accent", accent);
  return u.toString();
}

/* ------------------------------ tip feed ------------------------------ */

let cache = { at: 0, tips: [] };
const TTL = 12_000;

export async function loadTips({ token, streamer, force = false }) {
  if (!token || !streamer) return { tips: [], scanned: 0, error: null };
  if (!force && Date.now() - cache.at < TTL) return { ...cache, error: null };
  try {
    const { tips, scanned } = await getIncomingTransfers({ token, to: streamer });
    cache = { at: Date.now(), tips, scanned };
    return { tips, scanned, error: null };
  } catch (err) {
    return { tips: cache.tips ?? [], scanned: 0, error: err instanceof Error ? err.message : "Could not read tips" };
  }
}

export const cachedTips = () => cache.tips;

export function leaderboard(tips, decimals) {
  const map = new Map();
  for (const t of tips) {
    const key = t.from.toLowerCase();
    const row = map.get(key) ?? { from: key, total: 0n, count: 0 };
    row.total += t.amount;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()]
    .sort((a, b) => (a.total === b.total ? b.count - a.count : a.total > b.total ? -1 : 1))
    .slice(0, 6)
    .map((r) => ({ ...r, display: Number(r.total) / 10 ** decimals }));
}

/** Demo stream: fake tips so reviewers can see the overlay without a wallet. */
export function startDemoFeed(onTip, { min = 1 } = {}) {
  const names = ["0x7a3f", "0xbe11", "0x4c02", "0xd9aa", "0x21f0", "0x88cd"];
  let id = 0;
  const timer = setInterval(() => {
    const amount = (Math.random() * 24 + min).toFixed(2);
    const from = names[Math.floor(Math.random() * names.length)] + Math.random().toString(16).slice(2, 6);
    id += 1;
    onTip({ from, amount: Number(amount), block: null, tx: null, demo: true, id });
  }, 6500);
  return timer; // pass to clearInterval
}
