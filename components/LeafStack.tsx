"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./LeafStack.module.css";

const TURN_DEG = 172;
const PROGRESS_SPAN = 0.82; // fraction of the frame width that spans a full turn

type Dir = "next" | "prev";

type Anim = { dir: Dir; leaf: number } | null;

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
  const [anim, setAnim] = useState<Anim>(null);
  const [hintGone, setHintGone] = useState(false);
  const [reduced, setReduced] = useState(false);

  const leafRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bendRefs = useRef<Array<HTMLDivElement | null>>([]);
  const turnRef = useRef(0); // 0 = flat on top, 1 = fully turned away
  const velRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const dragRef = useRef<
    | { dir: Dir; leaf: number; x0: number; w: number; moved: number; t0: number; last: number }
    | null
  >(null);

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
      if (typeof window === "undefined") return;
      window.history.replaceState(null, "", href(i));
    },
    [href],
  );

  /** Push the current turn value onto the turning leaf. */
  const paint = useCallback((leaf: number, turn: number) => {
    const el = leafRefs.current[leaf];
    if (el) el.style.transform = `rotateY(${(-turn * TURN_DEG).toFixed(2)}deg)`;
    const bend = bendRefs.current[leaf];
    if (bend) bend.style.opacity = (Math.sin(Math.PI * turn) * 0.6).toFixed(3);
  }, []);

  const stopRaf = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  /** Critically-damped spring on turnRef toward `target`, then `done()`. */
  const spring = useCallback(
    (leaf: number, target: number, done: () => void) => {
      busyRef.current = true;
      const k = 190;
      const c = 26;
      let prev = performance.now();

      const step = (now: number) => {
        const dt = Math.min(0.032, (now - prev) / 1000 || 0.016);
        prev = now;
        const x = turnRef.current - target;
        velRef.current += (-k * x - c * velRef.current) * dt;
        turnRef.current += velRef.current * dt;

        if (Math.abs(turnRef.current - target) < 0.002 && Math.abs(velRef.current) < 0.03) {
          turnRef.current = target;
          velRef.current = 0;
          paint(leaf, target);
          rafRef.current = null;
          busyRef.current = false;
          done();
          return;
        }
        paint(leaf, turnRef.current);
        rafRef.current = requestAnimationFrame(step);
      };

      stopRaf();
      rafRef.current = requestAnimationFrame(step);
    },
    [paint],
  );

  const settle = useCallback(
    (dir: Dir, leaf: number, commit: boolean) => {
      const target = dir === "next" ? (commit ? 1 : 0) : commit ? 0 : 1;
      const finish = () => {
        if (commit) {
          const nextIndex = dir === "next" ? leaf + 1 : leaf;
          setIndex(nextIndex);
          syncUrl(nextIndex);
        }
        setAnim(null);
        turnRef.current = 0;
        velRef.current = 0;
      };
      if (reduced) {
        turnRef.current = target;
        paint(leaf, target);
        finish();
        return;
      }
      spring(leaf, target, finish);
    },
    [paint, reduced, spring, syncUrl],
  );

  const begin = useCallback(
    (dir: Dir) => {
      if (busyRef.current || anim) return false;
      if (dir === "next" && index >= last) return false;
      if (dir === "prev" && index <= 0) return false;
      setHintGone(true);
      const leaf = dir === "next" ? index : index - 1;
      turnRef.current = dir === "next" ? 0 : 1;
      velRef.current = 0;
      setAnim({ dir, leaf });
      return true;
    },
    [anim, index, last],
  );

  // Turn triggered without a drag (button, keyboard, click zone).
  const turn = useCallback(
    (dir: Dir) => {
      if (!begin(dir)) return;
      const leaf = dir === "next" ? index : index - 1;
      // let the {anim} render land so the leaf gets its ref/z-index first
      requestAnimationFrame(() => settle(dir, leaf, true));
    },
    [begin, index, settle],
  );

  const jump = useCallback(
    (target: number) => {
      if (busyRef.current || anim) return;
      const clamped = Math.min(Math.max(target, 0), last);
      if (clamped === index) return;
      if (Math.abs(clamped - index) === 1) {
        turn(clamped > index ? "next" : "prev");
        return;
      }
      setHintGone(true);
      setIndex(clamped);
      syncUrl(clamped);
    },
    [anim, index, last, syncUrl, turn],
  );

  // ------------------------------------------------------------- drag
  const onZonePointerDown = (dir: Dir) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    if (!begin(dir)) return;
    const leaf = dir === "next" ? index : index - 1;
    const w = e.currentTarget.parentElement?.clientWidth ?? window.innerWidth;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      dir,
      leaf,
      x0: e.clientX,
      w,
      moved: 0,
      t0: performance.now(),
      last: turnRef.current,
    };
  };

  const onZonePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    d.moved = Math.max(d.moved, Math.abs(dx));
    const travel = dx / (d.w * PROGRESS_SPAN);
    const t = d.dir === "next" ? clamp01(-travel) : clamp01(1 - travel);
    turnRef.current = t;
    paint(d.leaf, t);
  };

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }

    const tap = d.moved < 6;
    const t = turnRef.current;
    const commit =
      tap ||
      (d.dir === "next" ? t > 0.38 : t < 0.62);
    settle(d.dir, d.leaf, commit);
  };

  // --------------------------------------------------------- keyboard
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

  useEffect(() => () => stopRaf(), []);

  // ----------------------------------------------------------- render
  const readout = useMemo(() => {
    if (index === 0) return "Cover";
    if (index === last) return "Colophon";
    return `${index} of ${storyCount}`;
  }, [index, last, storyCount]);

  const leafTransform = (i: number): string => {
    // The turning leaf gets its first frame straight from the live turn value
    // (a ref, so reading it here is deliberate) and is imperative thereafter.
    if (anim && i === anim.leaf) {
      return `rotateY(${(-turnRef.current * TURN_DEG).toFixed(2)}deg)`;
    }
    if (i < index) return `rotateY(${-TURN_DEG}deg)`;
    return "rotateY(0deg)";
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <div className={styles.stack}>
          {leaves.map((node, i) => {
            const turningHere = anim?.leaf === i;
            return (
              <div
                key={i}
                ref={(el) => {
                  leafRefs.current[i] = el;
                }}
                className={`${styles.leaf} grain${turningHere ? ` ${styles.turning}` : ""}`}
                style={{
                  zIndex: turningHere ? 999 : 500 - i,
                  transform: leafTransform(i),
                }}
                aria-hidden={i !== index ? true : undefined}
              >
                {node}
                <div
                  className={styles.bend}
                  ref={(el) => {
                    bendRefs.current[i] = el;
                  }}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.zone} ${styles.zonePrev}`}
          aria-label="Previous page"
          disabled={index <= 0}
          onPointerDown={onZonePointerDown("prev")}
          onPointerMove={onZonePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        <button
          type="button"
          className={`${styles.zone} ${styles.zoneNext}`}
          aria-label="Next page"
          disabled={index >= last}
          onPointerDown={onZonePointerDown("next")}
          onPointerMove={onZonePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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
              i === 0
                ? "Cover"
                : i === last
                  ? "Colophon"
                  : `Story ${i} of ${storyCount}`
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

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
