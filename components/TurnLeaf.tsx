"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";

import { pageBend } from "@/lib/pageCurl";
import styles from "./TurnLeaf.module.css";

export type TurnHandle = { apply: (progress: number) => void };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * One sheet flipping about the spine. `dir` "next" flips the right page left
 * (hinge at the gutter, 0 → -180); "prev" flips the left page right (0 → +180).
 * The parent owns the clock and pushes progress in through `apply`.
 *
 * A paper leaf also bows as it lifts — the free edge leads, then whips past —
 * so the sheet catches light along a moving crown and rolls at its outer
 * corner. `rigid` turns that off for the hardcover board, which does not flex.
 */
export const TurnLeaf = forwardRef<
  TurnHandle,
  { dir: "next" | "prev"; front: ReactNode; back: ReactNode; rigid?: boolean }
>(function TurnLeaf({ dir, front, back, rigid = false }, ref) {
  const leafRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const bowRef = useRef(0); // lagged progress the bow is taken from

  useImperativeHandle(
    ref,
    (): TurnHandle => ({
      apply(progress) {
        const p = clamp01(progress);
        // the free edge keeps flexing a few frames behind the spine
        bowRef.current += (p - bowRef.current) * 0.35;
        const { swingDeg, bow, shade } = pageBend(p, bowRef.current);
        const flex = rigid ? 0 : bow;

        const el = leafRef.current;
        if (el) {
          el.style.setProperty(
            "--rot",
            `${((dir === "next" ? -1 : 1) * swingDeg).toFixed(2)}deg`,
          );
          // shading of the bow: a bright crown with a trough behind it,
          // strongest where the sheet is most edge-on and most bent
          el.style.setProperty(
            "--bend",
            (shade * Math.min(1, flex * 1.7)).toFixed(3),
          );
          // the outer corner rolls as the sheet bows
          el.style.setProperty("--curl", `${(flex * 24).toFixed(1)}px`);
        }

        const arc = Math.sin(Math.PI * p); // peaks at the half-turn
        // the bend layer now carries most of the highlight; keep a little
        // plain sheen so the board (rigid, no bend layer) still glances light
        sheenRef.current?.style.setProperty(
          "--sheen",
          (arc * (rigid ? 0.5 : 0.24)).toFixed(3),
        );

        // the cast shadow is the lifting page darkening the leaf beneath it:
        // an early-turn effect. It must be gone by the time the sheet is up
        // and over, or it lingers on the page just revealed.
        const cast = arc * Math.max(0, 1 - p * 1.9);
        shadowRef.current?.style.setProperty("--sh", (cast * 0.6).toFixed(3));
      },
    }),
    [dir, rigid],
  );

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
        ref={leafRef}
        className={`${styles.leaf} ${dir === "next" ? styles.leafNext : styles.leafPrev}`}
        aria-hidden
      >
        <div className={`${styles.face} ${styles.front} grain`}>
          {front}
          {rigid ? null : <div className={styles.bend} />}
          <div ref={sheenRef} className={styles.sheen} />
        </div>
        <div className={`${styles.face} ${styles.back} grain`}>
          {back}
          {rigid ? null : <div className={styles.bend} />}
        </div>
      </div>
    </>
  );
});
