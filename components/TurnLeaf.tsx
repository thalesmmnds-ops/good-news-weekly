"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { curlNums } from "@/lib/pageCurl";
import styles from "./TurnLeaf.module.css";

export type TurnHandle = { apply: (progress: number) => void };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// strips forming the arc: 18 reads as a smooth curve on a full-size page;
// a phone's page is a fraction of the width, so half as many still reads
// clean and roughly halves the per-frame style work and the DOM
const STRIPS_DESKTOP = 18;
const STRIPS_MOBILE = 9;
function stripCount(): number {
  if (typeof window === "undefined") return STRIPS_DESKTOP;
  return window.matchMedia("(max-width: 720px)").matches
    ? STRIPS_MOBILE
    : STRIPS_DESKTOP;
}

/**
 * One sheet flipping about the spine.
 *
 * The leaf is a chain of `N` nested strips whose rotations accumulate into
 * an arc, so the sheet bends the way paper bends instead of pivoting like a
 * flat door. Each strip carries its own clipped slice of the page markup,
 * lit from its real facing angle.
 *
 * `dir` "next" flips the right page left (hinge at the gutter); "prev" flips
 * the left page right. The parent owns the clock and pushes progress in
 * through `apply`.
 */
export const TurnLeaf = forwardRef<
  TurnHandle,
  { dir: "next" | "prev"; front: ReactNode; back: ReactNode }
>(function TurnLeaf({ dir, front, back }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);
  const capFront = useRef<HTMLDivElement>(null);
  const capBack = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<{ f: string; b: string } | null>(null);
  // read once per turn (the leaf remounts each turn, so it re-checks)
  const n = useRef(stripCount()).current;

  // lift the page markup out of the hidden copies and into every strip's
  // clipped slice — runs before paint, so there is no blank first frame
  useLayoutEffect(() => {
    setHtml({
      f: capFront.current?.innerHTML ?? "",
      b: capBack.current?.innerHTML ?? "",
    });
  }, []);

  useImperativeHandle(
    ref,
    (): TurnHandle => ({
      apply(progress) {
        const p = clamp01(progress);
        const { ttDeg, tdDeg, shade, lit } = curlNums(p, n);
        const el = rootRef.current;
        if (el) {
          el.style.setProperty("--tt", `${ttDeg.toFixed(2)}deg`);
          el.style.setProperty("--td", `${tdDeg.toFixed(3)}deg`);
          el.style.setProperty("--shade", shade.toFixed(3));
        }
        for (let i = 0; i < n; i += 1) {
          const strip = stripRef.current[i];
          if (!strip) continue;
          strip.style.setProperty("--lit", lit[i].toFixed(3));
          strip.style.setProperty("--a1", ((1 - lit[i]) * 0.62).toFixed(3));
          strip.style.setProperty("--a2", ((1 - lit[i + 1]) * 0.62).toFixed(3));
        }
        // the leaf's own shadow on the spread beneath it — present the whole
        // turn, strongest when the sheet stands most upright
        shadowRef.current?.style.setProperty("--sh", (shade * 0.5).toFixed(3));
      },
    }),
    [n],
  );

  let tree: ReactNode = null;
  for (let i = n - 1; i >= 0; i -= 1) {
    const inner = tree;
    tree = (
      <div
        key={i}
        ref={(node) => {
          stripRef.current[i] = node;
        }}
        className={styles.strip}
        style={{ "--i": i } as CSSProperties}
      >
        <div className={`${styles.face} ${styles.front} grain`}>
          <div
            className={styles.slice}
            dangerouslySetInnerHTML={{ __html: html?.f ?? "" }}
            aria-hidden
          />
          <div className={styles.sh} />
          <div className={styles.gl} />
        </div>
        <div className={`${styles.face} ${styles.back} grain`}>
          <div
            className={styles.slice}
            dangerouslySetInnerHTML={{ __html: html?.b ?? "" }}
            aria-hidden
          />
          <div className={styles.sh} />
          <div className={styles.gl} />
        </div>
        {inner}
      </div>
    );
  }

  return (
    <>
      {/* hidden: the page nodes rendered once so their markup can be lifted */}
      <div ref={capFront} hidden>
        {front}
      </div>
      <div ref={capBack} hidden>
        {back}
      </div>

      <div
        ref={shadowRef}
        className={`${styles.shadow} ${
          dir === "next" ? styles.shadowNext : styles.shadowPrev
        }`}
        aria-hidden
      />
      <div
        ref={rootRef}
        className={`${styles.curl} ${
          dir === "next" ? styles.curlNext : styles.curlPrev
        }`}
        style={{ "--n": n } as CSSProperties}
        aria-hidden
      >
        {tree}
        {/* a constant darkening along the hinge edge: rides with the leaf, so
            when it lands flat it sits exactly where the static page's spine
            shadow will be — the handoff has nothing to pop in */}
        <div className={styles.spine} />
      </div>
    </>
  );
});
