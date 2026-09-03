"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isSettled, stepSpring, type Spring } from "@/lib/pageCurl";

import { TurnLeaf, type TurnHandle } from "./TurnLeaf";
import styles from "./Book.module.css";

export type BookPage = {
  node: React.ReactNode;
  label: string;
};

const LEAN_REST_X = 11;
const LEAN_MAX_X = 4;
const LEAN_MAX_Y = 3.5;

type Dir = "next" | "prev";
type Turn = { dir: Dir; s: number } | null;

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
  const [turn, setTurnState] = useState<Turn>(null);
  const [reduced, setReduced] = useState(false);

  const bookRef = useRef<HTMLDivElement>(null);
  const turnApi = useRef<TurnHandle>(null);
  const turnRef = useRef<Turn>(null);
  const springRef = useRef<Spring>({ t: 0, v: 0 });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const busyRef = useRef(false);

  const setTurn = useCallback((t: Turn) => {
    turnRef.current = t;
    setTurnState(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const page = (i: number) => pages[i]?.node ?? null;
  const left = pages[spread * 2];
  const right = pages[spread * 2 + 1];

  const href = useCallback(
    (s: number) => (s <= 0 ? `${basePath}/` : `${basePath}/${s * 2}/`),
    [basePath],
  );
  const syncUrl = useCallback(
    (s: number) => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", href(s));
    },
    [href],
  );

  const settle = useCallback(
    (to: number) => {
      setSpread(to);
      syncUrl(to);
    },
    [syncUrl],
  );

  // ------------------------------------------------------------- clock
  const finish = useCallback(() => {
    const t = turnRef.current;
    busyRef.current = false;
    if (t) settle(t.dir === "next" ? t.s + 1 : t.s - 1);
    setTurn(null);
  }, [setTurn, settle]);

  const drive = useCallback(() => {
    if (rafRef.current !== null) return;
    const startedAt = performance.now();
    lastRef.current = startedAt;
    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - lastRef.current) / 1000 || 0.016);
      lastRef.current = now;
      const s = springRef.current;
      stepSpring(s, 1, dt);
      turnApi.current?.apply(s.t);
      if (isSettled(s, 1) || now - startedAt > 2500) {
        turnApi.current?.apply(1);
        rafRef.current = null;
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [finish]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // ------------------------------------------------------------- turning
  const step = useCallback(
    (dir: Dir) => {
      if (busyRef.current || turnRef.current) return;
      if (dir === "next" && spread >= spreadCount - 1) return;
      if (dir === "prev" && spread <= 0) return;

      if (reduced || (typeof document !== "undefined" && document.hidden)) {
        settle(dir === "next" ? spread + 1 : spread - 1);
        return;
      }

      busyRef.current = true;
      springRef.current = { t: 0, v: 0 };
      setTurn({ dir, s: spread });
      requestAnimationFrame(() => drive());
    },
    [drive, reduced, settle, setTurn, spread, spreadCount],
  );

  const go = useCallback(
    (to: number) => {
      if (busyRef.current || turnRef.current) return;
      const clamped = Math.min(Math.max(to, 0), spreadCount - 1);
      if (clamped === spread) return;
      if (Math.abs(clamped - spread) === 1) {
        step(clamped > spread ? "next" : "prev");
        return;
      }
      settle(clamped);
    },
    [settle, spread, spreadCount, step],
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
        step("next");
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        step("prev");
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
  }, [go, spreadCount, step]);

  // the book leans toward the pointer, so its depth reads as a solid object
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

  // dev aid: window.__gnwTurn("next", 0.4) mounts a turn and freezes it
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __gnwTurn?: (d: Dir, p: number) => void }).__gnwTurn = (d, p) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      springRef.current = { t: p, v: 0 };
      if (!turnRef.current) setTurn({ dir: d, s: spread });
      window.setTimeout(() => turnApi.current?.apply(p), 60);
    };
  }, [setTurn, spread]);

  const s = turn ? turn.s : spread;

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

            {turn ? (
              <>
                <div
                  className={`${styles.incoming} ${
                    turn.dir === "next" ? styles.incomingRight : styles.incomingLeft
                  } grain`}
                >
                  {turn.dir === "next" ? page(s * 2 + 3) : page(s * 2 - 2)}
                </div>
                <TurnLeaf
                  key={`${turn.dir}-${turn.s}`}
                  ref={turnApi}
                  dir={turn.dir}
                  front={turn.dir === "next" ? page(s * 2 + 1) : page(s * 2)}
                  back={turn.dir === "next" ? page(s * 2 + 2) : page(s * 2 - 1)}
                />
              </>
            ) : null}

            <div className={styles.gutter} aria-hidden />
          </div>
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowPrev}`}
          aria-label="Previous pages"
          disabled={spread <= 0}
          onClick={() => step("prev")}
        >
          &lsaquo;
        </button>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowNext}`}
          aria-label="Next pages"
          disabled={spread >= spreadCount - 1}
          onClick={() => step("next")}
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}
