"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";

import styles from "./TurnLeaf.module.css";

export type TurnHandle = { apply: (progress: number) => void };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * One sheet flipping about the spine. `dir` "next" flips the right page left
 * (hinge at the gutter, 0 → -180); "prev" flips the left page right (0 → +180).
 * The parent owns the clock and pushes progress in through `apply`.
 */
export const TurnLeaf = forwardRef<
  TurnHandle,
  { dir: "next" | "prev"; front: ReactNode; back: ReactNode }
>(function TurnLeaf({ dir, front, back }, ref) {
  const leafRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    (): TurnHandle => ({
      apply(progress) {
        const p = clamp01(progress);
        const deg = (dir === "next" ? -180 : 180) * p;
        leafRef.current?.style.setProperty("--rot", `${deg.toFixed(2)}deg`);
        const mid = Math.sin(Math.PI * p); // peaks at the half-turn
        sheenRef.current?.style.setProperty("--sheen", (mid * 0.5).toFixed(3));
        shadowRef.current?.style.setProperty("--sh", (mid * 0.5).toFixed(3));
      },
    }),
    [dir],
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
          <div ref={sheenRef} className={styles.sheen} />
        </div>
        <div className={`${styles.face} ${styles.back} grain`}>{back}</div>
      </div>
    </>
  );
});
