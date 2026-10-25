// Builds src/palette.css from one OKLCH recipe. Run: npm run palette
//
// Every color is the same recipe with a different hue. Lightness and chroma
// are set by role, so all feelings sit at the same contrast and the same
// "loudness". Specificity sets saturation: the halves on the first screen
// are soft, families are richer, and the size ladder ends at the most vivid
// tone. Calm, at the center of the sphere, is nearly colorless.
//
// Fails (exit 1) if any text pairing is below 4.5:1, or a UI edge is below
// 3:1 on the page, in light or dark.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Hue angles in OKLCH. `k` scales chroma (calm is muted by design).
export const HUES = {
  calm: { h: 235, k: 0.35 },
  good: { h: 80, k: 1 },
  notgood: { h: 285, k: 1 },
  happy: { h: 95, k: 1 },
  excited: { h: 55, k: 1 },
  proud: { h: 350, k: 1 },
  content: { h: 150, k: 1 },
  scared: { h: 305, k: 1 },
  overwhelmed: { h: 200, k: 1 },
  sad: { h: 255, k: 1 },
  mad: { h: 25, k: 1 }
};

// Roles: [lightness, chroma]. Chroma is the target; it is reduced only as far
// as needed to stay inside sRGB.
const ROLES = {
  light: {
    wash: [0.965, 0.02], // screen background once a feeling is chosen
    tint: [0.94, 0.045], // depth 0: halves on the first screen
    edge: [0.55, 0.1],
    ink: [0.37, 0.09],
    tint1: [0.92, 0.075], // depth 1: a family
    edge1: [0.55, 0.15],
    fill1: [0.87, 0.1], // depth 2: size ladder, a little → a lot
    fill2: [0.76, 0.16],
    fill3: [0.52, 0.22],
    dot: [0.53, 0.22] // the child's dot on the sphere
  },
  dark: {
    wash: [0.225, 0.02],
    tint: [0.3, 0.045],
    edge: [0.78, 0.1],
    ink: [0.9, 0.05],
    tint1: [0.33, 0.075],
    edge1: [0.8, 0.14],
    fill1: [0.4, 0.09],
    fill2: [0.49, 0.15],
    fill3: [0.74, 0.19],
    dot: [0.8, 0.17]
  }
};

const BASE = {
  light: { bg: [0.97, 0.008, 80], surface: [0.995, 0.004, 80], text: [0.24, 0.01, 70], textOnVivid: [1, 0, 0] },
  dark: { bg: [0.2, 0.008, 80], surface: [0.25, 0.008, 80], text: [0.95, 0.008, 80], textOnVivid: [0.18, 0.01, 70] }
};

// ---------- OKLCH → sRGB ----------

function toLinear([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** Largest chroma ≤ C that fits sRGB at this lightness and hue. */
function fit([L, C, h]) {
  if (inGamut(toLinear([L, C, h]))) return [L, C, h];
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(toLinear([L, mid, h]))) lo = mid;
    else hi = mid;
  }
  return [L, lo, h];
}

/** Lightness where this hue reaches its highest chroma inside sRGB. */
function cusp(h) {
  let best = [0, 0];
  for (let L = 0.3; L <= 0.97; L += 0.005) {
    const C = fit([L, 0.4, h])[1];
    if (C > best[1]) best = [L, C];
  }
  return best[0];
}

function hex(lch) {
  const enc = (x) => {
    x = Math.min(1, Math.max(0, x));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  return '#' + toLinear(fit(lch)).map((c) => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('');
}

function luminance(h) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ---------- Build ----------

function build(mode) {
  const r = ROLES[mode];
  const base = Object.fromEntries(Object.entries(BASE[mode]).map(([k, v]) => [k, hex(v)]));
  const vars = { bg: base.bg, surface: base.surface, text: base.text };
  const problems = [];

  for (const [name, { h, k }] of Object.entries(HUES)) {
    const c = (role) => hex([r[role][0], r[role][1] * k, h]);
    const v = {};
    for (const role of Object.keys(r)) v[role] = c(role);
    // "A lot" is the hue at its most vivid. Yellow and orange only get vivid
    // when they're light (dark text); blue and violet when they're deep
    // (light text). Lightness in the middle fails contrast both ways.
    if (k === 1) {
      const peak = cusp(h);
      const L =
        mode === 'light'
          ? peak >= 0.72 ? Math.min(peak, 0.8) : r.fill3[0]
          : peak >= 0.72 ? Math.min(Math.max(peak, 0.74), 0.8) : r.fill3[0];
      v.fill3 = hex([L, Math.min(r.fill3[1], 0.2), h]);
      v.dot = v.fill3;
    }
    // Text on each size fill: the hue's ink or the strong on-vivid color, whichever reads better.
    for (const n of [1, 2, 3]) {
      const fill = v[`fill${n}`];
      const options = [v.ink, base.text, base.textOnVivid];
      v[`on${n}`] = options.reduce((best, o) => (contrast(o, fill) > contrast(best, fill) ? o : best));
      if (contrast(v[`on${n}`], fill) < 4.5) problems.push(`${mode} ${name} on${n}: ${contrast(v[`on${n}`], fill).toFixed(2)}`);
    }
    for (const t of ['tint', 'tint1', 'wash']) {
      if (contrast(v.ink, v[t]) < 4.5) problems.push(`${mode} ${name} ink/${t}: ${contrast(v.ink, v[t]).toFixed(2)}`);
      if (contrast(base.text, v[t]) < 4.5) problems.push(`${mode} ${name} text/${t}: ${contrast(base.text, v[t]).toFixed(2)}`);
    }
    for (const e of ['edge', 'edge1']) {
      if (contrast(v[e], base.bg) < 3) problems.push(`${mode} ${name} ${e}/bg: ${contrast(v[e], base.bg).toFixed(2)}`);
    }
    // The dot always carries a ring in the text color, so its fill can be vivid.
    for (const [role, value] of Object.entries(v)) vars[`c-${name}-${role}`] = value;
  }
  return { vars, problems };
}

const light = build('light');
const dark = build('dark');
const problems = [...light.problems, ...dark.problems];

const block = (vars, indent) => Object.entries(vars).map(([k, v]) => `${indent}--${k}: ${v};`).join('\n');
const css = `/* Generated by scripts/palette.mjs — do not edit by hand. Run: npm run palette */

:root {
${block(light.vars, '  ')}
}

@media (prefers-color-scheme: dark) {
  :root {
${block(dark.vars, '    ')}
  }
}
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (problems.length) {
    console.error('Contrast check failed:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const out = new URL('../src/palette.css', import.meta.url);
  writeFileSync(out, css);
  console.log(`Wrote src/palette.css (${Object.keys(HUES).length} hues, light + dark). All contrast checks pass.`);
}
