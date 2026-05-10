/** localStorage: JSON ["#rrggbb","#rrggbb","#rrggbb"] */
export const CUSTOM_COLORS_KEY = "semestersync-custom-colors";

/** localStorage: JSON { vars: Record<string,string>, colorScheme: "light"|"dark" } for FOUC-free apply */
export const CUSTOM_SNAPSHOT_KEY = "semestersync-custom-snapshot";

export const DEFAULT_CUSTOM_COLORS: [string, string, string] = [
  "#f7f7f8",
  "#10101a",
  "#3b82f6",
];

const CUSTOM_STYLE_PROPS: readonly string[] = [
  "--ink-50-rgb",
  "--ink-100-rgb",
  "--ink-200-rgb",
  "--ink-300-rgb",
  "--ink-400-rgb",
  "--ink-500-rgb",
  "--ink-600-rgb",
  "--ink-700-rgb",
  "--ink-800-rgb",
  "--ink-900-rgb",
  "--surface-rgb",
  "--surface-strong-rgb",
  "--primary-rgb",
  "--primary-fg-rgb",
  "--accent-rgb",
];

export function normalizeHex(input: string): string | null {
  const s = input.trim();
  const m = s.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const x = parseInt(n.slice(1), 16);
  return { r: (x >> 16) & 255, g: (x >> 8) & 255, b: x & 255 };
}

function rgbStr(c: { r: number; g: number; b: number }): string {
  return `${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)}`;
}

function mix(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function relLum(c: { r: number; g: number; b: number }): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = f(c.r);
  const G = f(c.g);
  const B = f(c.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export type CustomThemeSnapshot = {
  vars: Record<string, string>;
  colorScheme: "light" | "dark";
};

/**
 * Map three user picks — page background, primary button, accent highlight —
 * into the full ink / surface / primary token set used by Tailwind theme vars.
 */
export function buildCustomThemeSnapshot(
  bgHex: string,
  primaryHex: string,
  accentHex: string
): CustomThemeSnapshot {
  const bg = hexToRgb(bgHex) ?? { r: 247, g: 247, b: 248 };
  const primary = hexToRgb(primaryHex) ?? { r: 16, g: 16, b: 26 };
  const accent = hexToRgb(accentHex) ?? { r: 59, g: 130, b: 246 };

  const darkPage = relLum(bg) < 0.22;
  const vars: Record<string, string> = {};

  if (!darkPage) {
    const ink900 = mix(bg, { r: 16, g: 16, b: 26 }, 0.9);
    vars["--ink-50-rgb"] = rgbStr(bg);
    vars["--ink-100-rgb"] = rgbStr(mix(bg, ink900, 0.06));
    vars["--ink-200-rgb"] = rgbStr(mix(bg, ink900, 0.12));
    vars["--ink-300-rgb"] = rgbStr(mix(bg, ink900, 0.2));
    vars["--ink-400-rgb"] = rgbStr(mix(bg, ink900, 0.32));
    vars["--ink-500-rgb"] = rgbStr(mix(bg, ink900, 0.45));
    vars["--ink-600-rgb"] = rgbStr(mix(bg, ink900, 0.58));
    vars["--ink-700-rgb"] = rgbStr(mix(bg, ink900, 0.7));
    vars["--ink-800-rgb"] = rgbStr(mix(bg, ink900, 0.82));
    vars["--ink-900-rgb"] = rgbStr(ink900);
    vars["--surface-rgb"] = rgbStr(mix(bg, { r: 255, g: 255, b: 255 }, 0.72));
    vars["--surface-strong-rgb"] = rgbStr(mix(bg, { r: 255, g: 255, b: 255 }, 0.55));
  } else {
    const ink900 = mix(bg, { r: 245, g: 245, b: 250 }, 0.93);
    vars["--ink-50-rgb"] = rgbStr(bg);
    vars["--ink-100-rgb"] = rgbStr(mix(bg, ink900, 0.08));
    vars["--ink-200-rgb"] = rgbStr(mix(bg, ink900, 0.16));
    vars["--ink-300-rgb"] = rgbStr(mix(bg, ink900, 0.28));
    vars["--ink-400-rgb"] = rgbStr(mix(bg, ink900, 0.42));
    vars["--ink-500-rgb"] = rgbStr(mix(bg, ink900, 0.55));
    vars["--ink-600-rgb"] = rgbStr(mix(bg, ink900, 0.66));
    vars["--ink-700-rgb"] = rgbStr(mix(bg, ink900, 0.76));
    vars["--ink-800-rgb"] = rgbStr(mix(bg, ink900, 0.86));
    vars["--ink-900-rgb"] = rgbStr(ink900);
    vars["--surface-rgb"] = rgbStr(mix(bg, ink900, 0.1));
    vars["--surface-strong-rgb"] = rgbStr(mix(bg, ink900, 0.16));
  }

  vars["--primary-rgb"] = rgbStr(primary);
  const primaryFg =
    relLum(primary) > 0.45 ? { r: 16, g: 16, b: 26 } : { r: 248, g: 248, b: 250 };
  vars["--primary-fg-rgb"] = rgbStr(primaryFg);
  vars["--accent-rgb"] = rgbStr(accent);

  return { vars, colorScheme: darkPage ? "dark" : "light" };
}

export function persistCustomTheme(colors: [string, string, string]) {
  const snap = buildCustomThemeSnapshot(colors[0], colors[1], colors[2]);
  try {
    window.localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
    window.localStorage.setItem(CUSTOM_SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
  return snap;
}

export function applyCustomSnapshotToDocument(snap: CustomThemeSnapshot) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.colorScheme = snap.colorScheme;
  for (const [k, v] of Object.entries(snap.vars)) {
    root.style.setProperty(k, v);
  }
}

export function clearCustomThemeFromDocument() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.colorScheme = "";
  for (const key of CUSTOM_STYLE_PROPS) {
    root.style.removeProperty(key);
  }
}

export function parseStoredCustomColors(): [string, string, string] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLORS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    const a = normalizeHex(String(parsed[0]));
    const b = normalizeHex(String(parsed[1]));
    const c = normalizeHex(String(parsed[2]));
    if (!a || !b || !c) return null;
    return [a, b, c];
  } catch {
    return null;
  }
}
