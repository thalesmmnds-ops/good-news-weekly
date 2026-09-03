/* ─────────────────────────────────────────────────────────────────────────
   The turning leaf is not a rigid plane — it is a sheet of paper that bows.

   It is drawn as N nested strips, each rotated a little more than the last,
   so the accumulated angle traces a smooth arc. This module is the maths:
   the per-frame geometry of that arc, and the spring that drives it.
   ───────────────────────────────────────────────────────────────────────── */

export const CURL_STRIPS = 18;

const BETA = 0.5; // total bow across the sheet at mid-turn, radians
const WHIP = 0.4; // free edge curls this much more than the spine (fraction)

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export type CurlStrip = {
  /** incremental rotation of this strip relative to its parent, radians */
  td: number;
  /** self-shadow gradient alphas across the strip (near edge, far edge) */
  a1: number;
  a2: number;
  /** specular gloss for this strip, 0..~0.22 */
  gloss: number;
};

export type CurlFrame = {
  /** angle of the sheet's spine edge — where the arc walk starts, radians */
  tt: number;
  /** 0..1, peaks at the half-turn — drives shadow and gloss strength */
  shade: number;
  strips: CurlStrip[];
};

/**
 * One frame of the bend.
 *
 * The sheet swings about its spine by `swing`. Across its width it also bows
 * by `beta` total, and that bow is centred on the swing — the spine sits a
 * little under it, the free edge a little over — so the middle of the page
 * faces roughly where an unbent page would, and only the edges lead and trail.
 *
 * @param t    progress of the turn: 0 = flat on the stack, 1 = turned away
 * @param bow  the *lagged* progress the curvature is taken from, so the sheet
 *             keeps flexing for a few frames after the pointer stops moving
 * @param n    strip count
 */
const TIME_K = 2.3; // S-curve steepness: rush the edge-on middle, dwell on the curve

/** Reshape linear progress so the sheet lingers where its curve reads and
 *  snaps through the thin edge-on moment in the middle. */
function easeSwing(p: number): number {
  const k = TIME_K;
  return 0.5 + Math.tanh(k * (p - 0.5)) / (2 * Math.tanh(k * 0.5));
}

export function curlFrame(t: number, bow: number, n: number = CURL_STRIPS): CurlFrame {
  const p = clamp01(t);
  const swing = Math.PI * easeSwing(p);
  const beta = BETA * Math.sin(Math.PI * clamp01(bow));
  const shade = Math.sin(swing);

  // start the spine half a bow under the swing; the td's below sum to `beta`
  const start = swing - beta / 2;
  const strips: CurlStrip[] = new Array(n);
  let facing = start;

  for (let i = 0; i < n; i++) {
    const k = i / (n - 1); // 0 at spine, 1 at the free edge
    // weights average to 1, so Σ td = beta; the free edge bends more
    const td = (beta / n) * (1 + WHIP * (k - 0.5));
    const near = Math.abs(Math.cos(facing));
    const far = Math.abs(Math.cos(facing + td));
    strips[i] = {
      td,
      a1: (1 - near) * 0.6,
      a2: (1 - far) * 0.6,
      gloss: shade * near * near * 0.22,
    };
    facing += td;
  }

  return { tt: start, shade, strips };
}

export type Spring = { t: number; v: number };

const K = 168; // stiffness
const C = 19; // damping — a touch below critical, so the page slaps down
const G = 30; // "gravity": helps the leaf over the unstable middle of the turn

/**
 * Advance the spring one step toward `target` (0 or 1). Beyond the plain
 * spring there is a weight term shaped like a hump — strongest at the halfway
 * point, zero at either end — that pushes the leaf toward its target while it
 * is balanced on edge, so a turn that only just makes it past centre still
 * falls the rest of the way. It vanishes at the target, so the spring settles
 * cleanly.
 */
export function stepSpring(s: Spring, target: 0 | 1, dt: number): void {
  const x = s.t - target;
  const hump = 4 * s.t * (1 - s.t); // 0 at both ends, 1 at t = 0.5
  const weight = (target === 1 ? G : -G) * Math.max(0, hump);
  const a = -K * x - C * s.v + weight;
  s.v += a * dt;
  s.t += s.v * dt;
}

export function isSettled(s: Spring, target: number): boolean {
  return Math.abs(s.t - target) < 0.0015 && Math.abs(s.v) < 0.03;
}

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
export { clamp01 };
