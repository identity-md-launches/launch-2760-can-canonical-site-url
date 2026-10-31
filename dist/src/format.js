// Small formatting helpers. No dependencies.

const int = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? int.format(n) : "—";
};

export const fmtCompact = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? compact.format(n) : "—";
};

/** BigInt base units -> display string with fixed decimals. */
export function fromBaseUnits(value, decimals = 18, digits = 2) {
  try {
    const v = BigInt(value);
    const neg = v < 0n;
    const abs = neg ? -v : v;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = (abs % base).toString().padStart(decimals, "0").slice(0, digits).replace(/0+$/, "");
    return `${neg ? "-" : ""}${int.format(whole)}${frac ? `.${frac}` : ""}`;
  } catch {
    return "—";
  }
}

/** Decimal string -> BigInt base units, without floating point. */
export function toBaseUnits(input, decimals = 18) {
  const s = String(input).trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") throw new Error("Enter a valid amount");
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals) throw new Error(`Use at most ${decimals} decimals`);
  return BigInt((whole || "0") + frac.padEnd(decimals, "0"));
}

export const shortAddr = (a, n = 4) =>
  typeof a === "string" && a.length > 2 * n + 2 ? `${a.slice(0, 2 + n)}…${a.slice(-n)}` : String(a ?? "—");

/** millimetres -> km / m, hamster-wheel scale. */
export function fmtDistance(mm) {
  const n = Number(mm);
  if (!Number.isFinite(n) || n <= 0) return { value: "0", unit: "km" };
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(2), unit: "km" };
  if (n >= 1_000) return { value: (n / 1_000).toFixed(1), unit: "m" };
  return { value: n.toFixed(0), unit: "mm" };
}

export function timeAgo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export const pct = (a, b) => (b > 0 ? clamp((a / b) * 100, 0, 100) : 0);
