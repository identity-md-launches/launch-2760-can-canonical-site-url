// Read-only client for the public Squeekchain API.
// Every call fails soft: callers keep the last good snapshot.

export const API_BASE = "https://api.squeekchain.com";
const DEFAULT_TTL = 6000;
const cache = new Map();
let lastSnapshot = null;

async function get(path, { ttl = DEFAULT_TTL, timeout = 8000 } = {}) {
  const hit = cache.get(path);
  const now = Date.now();
  if (hit && now - hit.at < ttl) return hit.data;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, { at: now, data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const loadStatus = () => get("/v1/status", { ttl: 3000 });
export const loadCore = () => get("/v1/core", { ttl: 3000 });
export const loadEconomy = () => get("/v1/economy/state", { ttl: 8000 });
export const loadEvents = (limit = 20) => get(`/v1/events?category=all&limit=${limit}`, { ttl: 4000 });
export const loadStats = (range = "7d") => get(`/v1/measurement/stats?range=${range}`, { ttl: 30000 });
export const loadAccount = (address) => get(`/v1/accounts/${address}?limit=10`, { ttl: 8000 });

/** Everything the overlay needs, in parallel, tolerating individual failures. */
export async function loadSnapshot() {
  const [status, core, economy, events, stats] = await Promise.allSettled([
    loadStatus(),
    loadCore(),
    loadEconomy(),
    loadEvents(24),
    loadStats("7d"),
  ]);
  const pick = (r) => (r.status === "fulfilled" ? r.value : null);
  const next = {
    at: Date.now(),
    status: pick(status) ?? lastSnapshot?.status ?? null,
    core: pick(core) ?? lastSnapshot?.core ?? null,
    economy: pick(economy) ?? lastSnapshot?.economy ?? null,
    events: pick(events) ?? lastSnapshot?.events ?? null,
    stats: pick(stats) ?? lastSnapshot?.stats ?? null,
    staleSources: Object.entries({ status, core, economy, events, stats }).filter(([, result]) => result.status === "rejected").map(([name]) => name),
  };
  lastSnapshot = next;
  return next;
}

const TYPE_COPY = {
  "system.settlement_completed": "settlement",
  "system.mining_checkpointed": "checkpoint",
  "account.rewards_claimed": "rewards claimed",
  "account.rewards_staked": "rewards staked",
  "account.sqk_staked": "SQK staked",
  "account.sqk_unstaked": "SQK unstaked",
  "account.claim_recipient_set": "claim recipient set",
  "nft.deposited": "NFT deposited",
  "nft.withdrawn": "NFT withdrawn",
  "nft.merged": "NFT merged",
  "nft.launch_claimed": "genesis NFT claimed",
  "measurement.distance_milestone": "distance milestone",
  "measurement.daily_distance_milestone": "daily distance",
  "measurement.speed_milestone": "speed milestone",
  "measurement.speed_record": "speed record",
  "measurement.distance_streak": "streak",
};

export const eventLabel = (type) => TYPE_COPY[type] ?? String(type).replace(/[._]/g, " ");

/** Turn one API event into a single ticker line. */
export function eventLine(ev) {
  const label = eventLabel(ev?.type);
  const p = ev?.payload ?? {};
  const bits = [];
  if (p.blockHeight) bits.push(`block #${p.blockHeight}`);
  if (p.workAdded) bits.push(`${p.workAdded} work`);
  if (p.completedBlockCount) bits.push(`${p.completedBlockCount} blocks`);
  const detail = bits.length ? bits.join(" · ") : ev?.source?.blockNumber ? `block ${Number(ev.source.blockNumber)}` : "";
  return { label, detail, at: ev?.occurredAt ?? null, type: ev?.type ?? "" };
}
