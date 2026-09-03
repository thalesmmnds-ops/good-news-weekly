"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { clamp, curlFrame, isSettled, stepSpring, type Spring } from "@/lib/pageCurl";

import { LiveCurl, type CurlHandle } from "./LiveCurl";
import styles from "./LeafStack.module.css";

const AWAY_DEG = 180;
const DRAG_SPAN = 0.62; // fraction of the frame width that spans a full turn


type Dir = "next" | "prev";
type Curl = { dir: Dir; leaf: number; from: 0 | 1; width: number } | null;
type Drag = {
  dir: Dir;
  x0: number;
  w: number;
  moved: number;
  lastX: number;
  lastT: number;
  vel: number;
} | null;

export function LeafStack({
  leaves,
  initialIndex = 0,
  basePath,
  storyCount,
}: {
  leaves: React.ReactNode[];
  initialIndex?: number;
  basePath: string;
  storyCount: number;
}) {
  const last = leaves.length - 1;
  const start = Math.min(Math.max(initialIndex, 0), last);

  const [index, setIndex] = useState(start);
  const [curl, setCurlState] = useState<Curl>(null);
  const [hintGone, setHintGone] = useState(false);
  const [reduced, setReduced] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const curlApi = useRef<CurlHandle>(null);
  const curlRef = useRef<Curl>(null);
  const springRef = useRef<Spring>({ t: 0, v: 0 });
  const bowRef = useRef(0);
  const targetRef = useRef<0 | 1>(1);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const busyRef = useRef(false);
  const dragRef = useRef<Drag>(null);

  const setCurl = useCallback((next: Curl) => {
    curlRef.current = next;
    setCurlState(next);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const href = useCallback(
    (i: number) => (i <= 0 ? `${basePath}/` : `${basePath}/${i}/`),
    [basePath],
  );
  const syncUrl = useCallback(
    (i: number) => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", href(i));
    },
    [href],
  );

  const commitTo = useCallback(
    (i: number) => {
      setHintGone(true);
      setIndex(i);
      syncUrl(i);
    },
    [syncUrl],
  );

  // ---------------------------------------------------------------- clock
  const finishTurn = useCallback(() => {
    const c = curlRef.current;
    busyRef.current = false;
    if (c) {
      const committed = targetRef.current === (c.dir === "next" ? 1 : 0);
      if (committed) {
        const ni = c.dir === "next" ? c.leaf + 1 : c.leaf;
        setIndex(ni);
        syncUrl(ni);
      }
    }
    setHintGone(true);
    setCurl(null);
  }, [setCurl, syncUrl]);

  const stopRaf = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const drive = useCallback(() => {
    if (rafRef.current !== null) return;
    const startedAt = performance.now();
    lastFrameRef.current = startedAt;

    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - lastFrameRef.current) / 1000 || 0.016);
      lastFrameRef.current = now;

      const s = springRef.current;
      stepSpring(s, targetRef.current, dt);
      // the bend lags the position, so the sheet keeps flexing a moment
      bowRef.current += (s.t - bowRef.current) * 0.22;
      curlApi.current?.apply(curlFrame(s.t, bowRef.current));

      if (isSettled(s, targetRef.current) || now - startedAt > 2500) {
        s.t = targetRef.current;
        s.v = 0;
        bowRef.current = s.t;
        curlApi.current?.apply(curlFrame(s.t, s.t));
        rafRef.current = null;
        finishTurn();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [finishTurn]);

  useEffect(() => () => stopRaf(), []);

  // paint the first frame before the browser shows the freshly-mounted sheet
  useLayoutEffect(() => {
    if (curl) curlApi.current?.apply(curlFrame(springRef.current.t, bowRef.current));
  }, [curl]);

  // dev aid: window.__gnwCurl(0.3) mounts the sheet and freezes it at that
  // progress, for tuning the turn where rAF can't run (e.g. a hidden preview)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __gnwCurl?: (t: number) => void }).__gnwCurl = (t) => {
      stopRaf();
      const c = curlRef.current ?? { dir: "next" as Dir, leaf: index, from: 0 as const, width: frameRef.current?.clientWidth ?? 640 };
      if (!curlRef.current) setCurl(c);
      springRef.current = { t, v: 0 };
      bowRef.current = t;
      requestAnimationFrame(() => curlApi.current?.apply(curlFrame(t, t)));
    };
  }, [index, setCurl]);

  // ------------------------------------------------------------ start a turn
  const beginTurn = useCallback(
    (dir: Dir): { leaf: number } | null => {
      if (busyRef.current || curlRef.current) return null;
      if (dir === "next" && index >= last) return null;
      if (dir === "prev" && index <= 0) return null;

      const leaf = dir === "next" ? index : index - 1;
      // no motion for reduced-motion, or when the tab is hidden (rAF is paused)
      if (reduced || (typeof document !== "undefined" && document.hidden)) {
        commitTo(dir === "next" ? leaf + 1 : leaf);
        return null;
      }

      const from: 0 | 1 = dir === "next" ? 0 : 1;
      const width = frameRef.current?.clientWidth ?? 640;
      springRef.current = { t: from, v: 0 };
      bowRef.current = from;
      busyRef.current = true;
      setHintGone(true);
      setCurl({ dir, leaf, from, width });
      return { leaf };
    },
    [commitTo, index, last, reduced, setCurl],
  );

  const turn = useCallback(
    (dir: Dir) => {
      if (!beginTurn(dir)) return;
      targetRef.current = dir === "next" ? 1 : 0;
      drive();
    },
    [beginTurn, drive],
  );

  const jump = useCallback(
    (target: number) => {
      if (busyRef.current || curlRef.current) return;
      const clamped = Math.min(Math.max(target, 0), last);
      if (clamped === index) return;
      if (Math.abs(clamped - index) === 1) {
        turn(clamped > index ? "next" : "prev");
        return;
      }
      commitTo(clamped);
    },
    [commitTo, index, last, turn],
  );

  // --------------------------------------------------------------- dragging
  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const span = d.w * DRAG_SPAN;
    const dx = e.clientX - d.x0;
    d.moved = Math.max(d.moved, Math.abs(dx));

    const raw = d.dir === "next" ? -dx / span : 1 - dx / span;
    const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    const nowT = performance.now();
    const dtv = Math.max(1, nowT - d.lastT) / 1000;
    d.vel = -(e.clientX - d.lastX) / span / dtv;
    d.lastX = e.clientX;
    d.lastT = nowT;

    springRef.current.t = t;
    bowRef.current = t;
    curlApi.current?.apply(curlFrame(t, t));
  }, []);

  const onDragEnd = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    if (!d) return;

    const t = springRef.current.t;
    const tap = d.moved < 6;
    let commit: boolean;
    if (tap) commit = true;
    else if (d.dir === "next") commit = t > 0.42 || d.vel > 1.1;
    else commit = t < 0.58 || d.vel < -1.1;

    springRef.current.v = clamp(d.vel, -7, 7); // carry the fling into the spring
    targetRef.current = d.dir === "next" ? (commit ? 1 : 0) : commit ? 0 : 1;
    drive();
  }, [drive, onDragMove]);

  const onZonePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || dragRef.current) return;
      const dir = e.currentTarget.dataset.dir as Dir;
      const w = e.currentTarget.parentElement?.clientWidth ?? window.innerWidth;
      const x0 = e.clientX;

      if (!beginTurn(dir)) return;

      dragRef.current = {
        dir,
        x0,
        w,
        moved: 0,
        lastX: x0,
        lastT: performance.now(),
        vel: 0,
      };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragEnd, { once: true });
      window.addEventListener("pointercancel", onDragEnd, { once: true });
    },
    [beginTurn, onDragEnd, onDragMove],
  );

  // --------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          turn("next");
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          turn("prev");
          break;
        case "Home":
          e.preventDefault();
          jump(0);
          break;
        case "End":
          e.preventDefault();
          jump(last);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, last, turn]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
      window.removeEventListener("pointercancel", onDragEnd);
    };
  }, [onDragEnd, onDragMove]);

  // ----------------------------------------------------------------- render
  const readout = useMemo(() => {
    if (index === 0) return "Cover";
    if (index === last) return "Colophon";
    return `${index} of ${storyCount}`;
  }, [index, last, storyCount]);

  // while a "next" turn runs, the leaf being left lives only in the sheet
  const hiddenLeaf = curl && curl.dir === "next" ? curl.leaf : -1;

  return (
    <div className={styles.wrap}>
      <div className={styles.frame} ref={frameRef}>
        <div className={styles.stack}>
          {leaves.map((node, i) => (
            <div
              key={i}
              className={`${styles.leaf} grain`}
              style={{
                zIndex: 500 - i,
                transform: i < index ? `rotateY(-${AWAY_DEG}deg)` : "rotateY(0deg)",
                visibility: i === hiddenLeaf ? "hidden" : undefined,
              }}
              aria-hidden={i !== index ? true : undefined}
            >
              {node}
            </div>
          ))}

          {curl ? (
            <LiveCurl key={`${curl.leaf}-${curl.dir}`} ref={curlApi} width={curl.width}>
              {leaves[curl.leaf]}
            </LiveCurl>
          ) : null}
        </div>

        <button
          type="button"
          data-dir="prev"
          className={`${styles.zone} ${styles.zonePrev}`}
          aria-label="Previous page"
          disabled={index <= 0}
          onPointerDown={onZonePointerDown}
        />
        <button
          type="button"
          data-dir="next"
          className={`${styles.zone} ${styles.zoneNext}`}
          aria-label="Next page"
          disabled={index >= last}
          onPointerDown={onZonePointerDown}
        />
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Previous page"
          disabled={index <= 0}
          onClick={() => turn("prev")}
        >
          &lsaquo;
        </button>
        <span className={styles.readout}>{readout}</span>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Next page"
          disabled={index >= last}
          onClick={() => turn("next")}
        >
          &rsaquo;
        </button>
      </div>

      <div className={styles.ticks}>
        {leaves.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`${styles.tick}${i === index ? ` ${styles.tickOn}` : ""}`}
            aria-label={
              i === 0 ? "Cover" : i === last ? "Colophon" : `Story ${i} of ${storyCount}`
            }
            aria-current={i === index ? "true" : undefined}
            onClick={() => jump(i)}
          />
        ))}
      </div>

      <p className={`${styles.hint}${hintGone ? ` ${styles.hintGone}` : ""}`}>
        Drag the edges, use &larr; &rarr;, or tap the dots
      </p>
    </div>
  );
}
