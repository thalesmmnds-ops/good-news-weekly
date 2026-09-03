"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./Book.module.css";

export type BookPage = {
  node: React.ReactNode;
  /** short label for the reader position, e.g. "Cover" or "3" */
  label: string;
};

const LEAN_REST_X = 11;
const LEAN_MAX_X = 4;
const LEAN_MAX_Y = 3.5;

export function Book({
  pages,
  initialPage = 0,
  basePath,
}: {
  pages: BookPage[];
  initialPage?: number;
  basePath: string;
}) {
  const spreadCount = Math.ceil(pages.length / 2);
  const [spread, setSpread] = useState(
    Math.min(Math.floor(Math.max(initialPage, 0) / 2), spreadCount - 1),
  );
  const [hintGone, setHintGone] = useState(false);

  const bookRef = useRef<HTMLDivElement>(null);

  const leftIdx = spread * 2;
  const rightIdx = spread * 2 + 1;
  const left = pages[leftIdx];
  const right = pages[rightIdx];

  const href = useCallback(
    (s: number) => (s <= 0 ? `${basePath}/` : `${basePath}/${s * 2}/`),
    [basePath],
  );
  const go = useCallback(
    (s: number) => {
      const clamped = Math.min(Math.max(s, 0), spreadCount - 1);
      if (clamped === spread) return;
      setHintGone(true);
      setSpread(clamped);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", href(clamped));
      }
    },
    [href, spread, spreadCount],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(spread + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(spread - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(spreadCount - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, spread, spreadCount]);

  // the book leans toward the pointer, so its thickness reads as a solid object
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = bookRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.7)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
      el.style.setProperty("--lean-x", `${(LEAN_REST_X - ny * LEAN_MAX_X).toFixed(2)}deg`);
      el.style.setProperty("--lean-y", `${(nx * LEAN_MAX_Y).toFixed(2)}deg`);
    };
    const reset = () => {
      const el = bookRef.current;
      if (!el) return;
      el.style.setProperty("--lean-x", `${LEAN_REST_X}deg`);
      el.style.setProperty("--lean-y", "0deg");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", reset);
    };
  }, []);

  const readout = useMemo(() => {
    const labels = [left?.label, right?.label].filter(Boolean) as string[];
    if (labels.includes("Cover")) return "Cover";
    if (labels.includes("Colophon"))
      return labels.length > 1 ? `${labels[0]} · Colophon` : "Colophon";
    return labels.length === 2 ? `Stories ${labels[0]}–${labels[1]}` : `Story ${labels[0]}`;
  }, [left, right]);

  return (
    <div className={styles.wrap}>
      <div className={styles.scene}>
        <div className={styles.book} ref={bookRef}>
          <div className={styles.castShadow} aria-hidden />
          <div className={`${styles.fore} ${styles.foreLeft}`} aria-hidden />
          <div className={`${styles.fore} ${styles.foreRight}`} aria-hidden />
          <div className={styles.deckle} aria-hidden />

          <div className={styles.spread}>
            <div className={`${styles.page} ${styles.left} grain`}>{left?.node}</div>
            <div className={`${styles.page} ${styles.right} grain`}>{right?.node}</div>
            <div className={styles.gutter} aria-hidden />
          </div>
        </div>

        <button
          type="button"
          className={`${styles.arrows} ${styles.arrowPrev}`}
          aria-label="Previous pages"
          disabled={spread <= 0}
          onPointerDown={(e: ReactPointerEvent) => {
            if (e.button === 0) go(spread - 1);
          }}
        />
        <button
          type="button"
          className={`${styles.arrows} ${styles.arrowNext}`}
          aria-label="Next pages"
          disabled={spread >= spreadCount - 1}
          onPointerDown={(e: ReactPointerEvent) => {
            if (e.button === 0) go(spread + 1);
          }}
        />
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Previous pages"
          disabled={spread <= 0}
          onClick={() => go(spread - 1)}
        >
          &lsaquo;
        </button>
        <span className={styles.readout}>{readout}</span>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Next pages"
          disabled={spread >= spreadCount - 1}
          onClick={() => go(spread + 1)}
        >
          &rsaquo;
        </button>
      </div>

      <div className={styles.ticks}>
        {Array.from({ length: spreadCount }, (_, s) => (
          <button
            type="button"
            key={s}
            className={`${styles.tick}${s === spread ? ` ${styles.tickOn}` : ""}`}
            aria-label={`Spread ${s + 1} of ${spreadCount}`}
            aria-current={s === spread ? "true" : undefined}
            onClick={() => go(s)}
          />
        ))}
      </div>

      <p className={`${styles.hint}${hintGone ? ` ${styles.hintGone}` : ""}`}>
        Use the arrows, &larr; &rarr;, or the dots
      </p>
    </div>
  );
}
