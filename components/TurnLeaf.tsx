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
const N = 18; // strips — enough for the arc to read as a curve, not a fan

/**
 * One sheet flipping about the spine.
 *
 * A paper leaf is a chain of `N` nested strips whose rotations accumulate
 * into an arc, so the sheet bends the way paper bends instead of pivoting
 * like a flat door. Each strip carries its own clipped slice of the page
 * markup, lit from its real facing angle. `rigid` drops all of that for the
 * hardcover board, which stays one stiff plane.
 *
 * `dir` "next" flips the right page left (hinge at the gutter); "prev" flips
 * the left page right. The parent owns the clock and pushes progress in
 * through `apply`.
 */
export const TurnLeaf = forwardRef<
  TurnHandle,
  { dir: "next" | "prev"; front: ReactNode; back: ReactNode; rigid?: boolean }
>(function TurnLeaf({ dir, front, back, rigid = false }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<(HTMLDivElement | null)[]>([]);
  const sheenRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const capFront = useRef<HTMLDivElement>(null);
  const capBack = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<{ f: string; b: string } | null>(null);

  // lift the page markup out of the hidden copies and into every strip's
  // clipped slice — runs before paint, so there is no blank first frame
  useLayoutEffect(() => {
    if (rigid) return;
    setHtml({
      f: capFront.current?.innerHTML ?? "",
      b: capBack.current?.innerHTML ?? "",
    });
  }, [rigid]);

  useImperativeHandle(
    ref,
    (): TurnHandle => ({
      apply(progress) {
        const p = clamp01(progress);

        if (rigid) {
          const deg = (dir === "next" ? -180 : 180) * p;
          rootRef.current?.style.setProperty("--rot", `${deg.toFixed(2)}deg`);
          const arc = Math.sin(Math.PI * p);
          sheenRef.current?.style.setProperty("--sheen", (arc * 0.5).toFixed(3));
          const cast = arc * Math.max(0, 1 - p * 1.9);
          shadowRef.current?.style.setProperty("--sh", (cast * 0.6).toFixed(3));
          return;
        }

        const { ttDeg, tdDeg, shade, lit } = curlNums(p, N);
        const el = rootRef.current;
        if (el) {
          el.style.setProperty("--tt", `${ttDeg.toFixed(2)}deg`);
          el.style.setProperty("--td", `${tdDeg.toFixed(3)}deg`);
          el.style.setProperty("--shade", shade.toFixed(3));
        }
        for (let i = 0; i < N; i += 1) {
          const s = stripRef.current[i];
          if (!s) continue;
          s.style.setProperty("--lit", lit[i].toFixed(3));
          s.style.setProperty("--a1", ((1 - lit[i]) * 0.62).toFixed(3));
          s.style.setProperty("--a2", ((1 - lit[i + 1]) * 0.62).toFixed(3));
        }
        // the leaf's own shadow on the spread beneath it — present the whole
        // turn, strongest when the sheet stands most upright
        shadowRef.current?.style.setProperty("--sh", (shade * 0.5).toFixed(3));
      },
    }),
    [dir, rigid],
  );

  // ── the hardcover board: one flat, stiff plane ──────────────────────────
  if (rigid) {
    return (
      <>
        <div
          ref={shadowRef}
          className={`${styles.shadow} ${
            dir === "next" ? styles.shadowNext : styles.shadowPrev
          }`}
          aria-hidden
        />
        <div
          ref={rootRef}
          className={`${styles.leaf} ${
            dir === "next" ? styles.leafNext : styles.leafPrev
          }`}
          aria-hidden
        >
          <div className={`${styles.face} ${styles.front} grain`}>
            {front}
            <div ref={sheenRef} className={styles.sheen} />
          </div>
          <div className={`${styles.face} ${styles.back} grain`}>{back}</div>
        </div>
      </>
    );
  }

  // ── a paper leaf: nested strips forming a curved surface ────────────────
  let tree: ReactNode = null;
  for (let i = N - 1; i >= 0; i -= 1) {
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
        style={{ "--n": N } as CSSProperties}
        aria-hidden
      >
        {tree}
      </div>
    </>
  );
});
