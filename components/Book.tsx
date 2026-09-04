"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { clamp, isSettled, stepSpring, type Spring } from "@/lib/pageCurl";

import { TurnLeaf, type TurnHandle } from "./TurnLeaf";
import styles from "./Book.module.css";

export type BookPage = {
  node: React.ReactNode;
  label: string;
};

const LEAN_REST_X = 11;
const LEAN_MAX_X = 4;
const LEAN_MAX_Y = 3.5;
const DRAG_SPAN = 0.68; // fraction of a page's width that spans a full drag turn
// the cover only needs to swing to edge-on (90°, half of TurnLeaf's 180°
// range) to clear the spread -- at that angle it's foreshortened to a
// sliver, so handing off to the flat static spread underneath is seamless
const COVER_SWING = 0.5;

type Dir = "next" | "prev";
type Turn = { dir: Dir; s: number; kind?: "cover" } | null;
type Drag = {
  dir: Dir;
  x0: number;
  pageWidth: number;
  lastX: number;
  lastT: number;
  vel: number;
  moved: number;
} | null;

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
  // always starts shut, like picking up a physical book; a deep link still
  // opens straight to the right spread once you tap it open
  const [opened, setOpened] = useState(false);

  const bookRef = useRef<HTMLDivElement>(null);
  const turnApi = useRef<TurnHandle>(null);
  const turnRef = useRef<Turn>(null);
  const springRef = useRef<Spring>({ t: 0, v: 0 });
  const targetRef = useRef<0 | 1>(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const busyRef = useRef(false);
  const dragRef = useRef<Drag>(null);

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
    const committed = targetRef.current === 1;
    busyRef.current = false;
    if (t?.kind === "cover") {
      setOpened(committed);
      // closing the cover always returns to the title spread, like a real
      // book: opening it again starts from page one, not wherever a
      // previous session's turn had gotten to
      if (!committed) settle(0);
      setTurn(null);
      return;
    }
    if (t && committed) settle(t.dir === "next" ? t.s + 1 : t.s - 1);
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
      const target = targetRef.current;
      stepSpring(s, target, dt);
      // the cover only needs to swing clear of the spread, not flip all the
      // way over like an interior leaf joining the opposite stack — capping
      // its travel keeps it from sweeping across into the other page
      const scale = turnRef.current?.kind === "cover" ? COVER_SWING : 1;
      turnApi.current?.apply(s.t * scale);
      if (isSettled(s, target) || now - startedAt > 2500) {
        turnApi.current?.apply(target * scale);
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

  // the cover is just another leaf: same spring, same TurnLeaf, hinged at
  // the gutter — opening drives it 0 (flat, shut) -> 1 (swung past vertical),
  // closing drives the same leaf back down from 1 -> 0
  const beginCover = useCallback(
    (to: 0 | 1) => {
      if (busyRef.current || turnRef.current) return;
      if (reduced || (typeof document !== "undefined" && document.hidden)) {
        setOpened(to === 1);
        if (to === 0) settle(0);
        return;
      }
      busyRef.current = true;
      springRef.current = { t: to === 1 ? 0 : 1, v: 0 };
      targetRef.current = to;
      setTurn({ dir: "next", s: spread, kind: "cover" });
      requestAnimationFrame(() => drive());
    },
    [drive, reduced, settle, setTurn, spread],
  );
  const openCover = useCallback(() => beginCover(1), [beginCover]);
  const closeCover = useCallback(() => beginCover(0), [beginCover]);

  // ------------------------------------------------------------- turning
  /** Bounds/mode checks and turn setup shared by a click and a drag start. */
  const beginTurn = useCallback(
    (dir: Dir): boolean => {
      if (busyRef.current || turnRef.current) return false;
      // keep going past either end and the book shuts, like a real one
      if (dir === "next" && spread >= spreadCount - 1) {
        closeCover();
        return false;
      }
      if (dir === "prev" && spread <= 0) {
        closeCover();
        return false;
      }

      if (reduced || (typeof document !== "undefined" && document.hidden)) {
        settle(dir === "next" ? spread + 1 : spread - 1);
        return false;
      }

      busyRef.current = true;
      springRef.current = { t: 0, v: 0 };
      setTurn({ dir, s: spread });
      return true;
    },
    [closeCover, reduced, settle, setTurn, spread, spreadCount],
  );

  const step = useCallback(
    (dir: Dir) => {
      if (!beginTurn(dir)) return;
      targetRef.current = 1;
      requestAnimationFrame(() => drive());
    },
    [beginTurn, drive],
  );

  // --------------------------------------------------------------- dragging
  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const span = d.pageWidth * DRAG_SPAN;
    const dx = e.clientX - d.x0;
    d.moved = Math.max(d.moved, Math.abs(dx));

    const raw = d.dir === "next" ? -dx / span : dx / span;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    const now = performance.now();
    const dt = Math.max(1, now - d.lastT) / 1000;
    const stepDx = e.clientX - d.lastX;
    d.vel = (d.dir === "next" ? -stepDx : stepDx) / span / dt;
    d.lastX = e.clientX;
    d.lastT = now;

    springRef.current.t = p;
    turnApi.current?.apply(p);
  }, []);

  const onDragEnd = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    if (!d) return;

    const p = springRef.current.t;
    const tap = d.moved < 6;
    const commit = tap || p > 0.32 || d.vel > 1.1;

    springRef.current.v = clamp(d.vel, -7, 7); // carry the fling into the spring
    targetRef.current = commit ? 1 : 0;
    drive();
  }, [drive, onDragMove]);

  const onZonePointerDown = useCallback(
    (dir: Dir) => (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || dragRef.current) return;
      const pageWidth = (e.currentTarget.parentElement?.clientWidth ?? window.innerWidth) / 2;
      const x0 = e.clientX;

      if (!beginTurn(dir)) return;

      dragRef.current = {
        dir,
        x0,
        pageWidth,
        lastX: x0,
        lastT: performance.now(),
        vel: 0,
        moved: 0,
      };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragEnd, { once: true });
      window.addEventListener("pointercancel", onDragEnd, { once: true });
    },
    [beginTurn, onDragEnd, onDragMove],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
      window.removeEventListener("pointercancel", onDragEnd);
    };
  }, [onDragEnd, onDragMove]);

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
      if (!opened) {
        if (["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", " ", "Enter"].includes(e.key)) {
          e.preventDefault();
          openCover();
        }
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
  }, [go, openCover, opened, spreadCount, step]);

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

  // dev aid: window.__gnwTurn("next", 0.4) mounts a turn and freezes it;
  // window.__gnwCover(0.4) does the same for the cover-open/close leaf
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __gnwTurn?: (d: Dir, p: number) => void }).__gnwTurn = (d, p) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      springRef.current = { t: p, v: 0 };
      if (!turnRef.current) setTurn({ dir: d, s: spread });
      window.setTimeout(() => turnApi.current?.apply(p), 60);
    };
    (window as unknown as { __gnwCover?: (p: number) => void }).__gnwCover = (p) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      springRef.current = { t: p, v: 0 };
      if (!turnRef.current) setTurn({ dir: "next", s: spread, kind: "cover" });
      window.setTimeout(() => turnApi.current?.apply(p * COVER_SWING), 60);
    };
  }, [setTurn, spread]);

  const s = turn ? turn.s : spread;
  const coverTurn = turn?.kind === "cover" ? turn : null;
  const restingClosed = !opened && !coverTurn;
  const showContent = !restingClosed;

  return (
    <div className={styles.wrap}>
      <div className={`${styles.scene}${restingClosed ? ` ${styles.sceneClosed}` : ""}`}>
        <div className={styles.book} ref={bookRef}>
          <div className={styles.castShadow} aria-hidden />
          {showContent ? <div className={`${styles.fore} ${styles.foreLeft}`} aria-hidden /> : null}
          <div className={`${styles.fore} ${styles.foreRight}`} aria-hidden />
          <div className={styles.deckle} aria-hidden />

          {/* the spread is always mounted, exactly like any other turn --
              "closed" is just an opaque board sitting on top of it */}
          <div className={styles.spread}>
            <div className={`${styles.page} ${styles.left} grain`}>
              {showContent ? left?.node : null}
            </div>
            <div className={`${styles.page} ${styles.right} grain`}>
              {showContent ? right?.node : null}
            </div>

            {turn && !coverTurn ? (
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

            {coverTurn ? (
              <TurnLeaf
                key="cover"
                ref={turnApi}
                dir="next"
                front={<div className={styles.coverFace} />}
                back={<div className={styles.coverFace} />}
              />
            ) : null}

            {opened && !coverTurn ? (
              <>
                <div
                  className={`${styles.dragZone} ${styles.dragZoneLeft}`}
                  onPointerDown={onZonePointerDown("prev")}
                  aria-hidden
                />
                <div
                  className={`${styles.dragZone} ${styles.dragZoneRight}`}
                  onPointerDown={onZonePointerDown("next")}
                  aria-hidden
                />
              </>
            ) : null}

            {restingClosed ? (
              <button
                type="button"
                className={`${styles.closedCover} grain`}
                onClick={openCover}
                aria-label="Open the Edition"
              />
            ) : null}

            <div className={styles.gutter} aria-hidden />
          </div>
        </div>

        {opened && !coverTurn ? (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowPrev}`}
              aria-label={spread <= 0 ? "Close the Edition" : "Previous pages"}
              onClick={() => step("prev")}
            >
              &lsaquo;
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowNext}`}
              aria-label={spread >= spreadCount - 1 ? "Close the Edition" : "Next pages"}
              onClick={() => step("next")}
            >
              &rsaquo;
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
