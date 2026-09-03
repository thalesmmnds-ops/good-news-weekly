"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { CURL_STRIPS, type CurlFrame } from "@/lib/pageCurl";

import styles from "./LiveCurl.module.css";

const DEG = 180 / Math.PI;

export type CurlHandle = { apply: (frame: CurlFrame) => void };

type Props = {
  /** the leaf's content, rendered once per slat and slid into place */
  children: ReactNode;
  /** rendered leaf width in CSS pixels — sets the arc scale */
  width: number;
  n?: number;
};

/**
 * The bending sheet, built from `n` clipped copies of the live leaf rather
 * than a rasterised image, so the text stays real. Each slat is a flat quad;
 * `apply` walks the arc once per frame and drops each slat at its point along
 * it, tangent to the curve — the sheet is the polyline of those slats.
 */
export const LiveCurl = forwardRef<CurlHandle, Props>(function LiveCurl(
  { children, width, n = CURL_STRIPS },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slatRef = useRef<Array<HTMLDivElement | null>>([]);
  const shRef = useRef<Array<HTMLDivElement | null>>([]);
  const glRef = useRef<Array<HTMLDivElement | null>>([]);
  const widthRef = useRef(width);
  widthRef.current = width;

  useImperativeHandle(
    ref,
    (): CurlHandle => ({
      apply(frame) {
        rootRef.current?.style.setProperty("--tip", `${(-5 * frame.shade).toFixed(2)}deg`);
        const band = widthRef.current / n;
        let x = 0;
        let z = 0;
        let phi = frame.tt; // radians, rotation away from the flat page

        for (let i = 0; i < n; i++) {
          const s = frame.strips[i];
          if (!s) continue;
          const slat = slatRef.current[i];
          if (slat) {
            slat.style.transform =
              `translate3d(${x.toFixed(2)}px, 0px, ${z.toFixed(2)}px) ` +
              `rotateY(${(-phi * DEG).toFixed(3)}deg)`;
          }
          const sh = shRef.current[i];
          if (sh) {
            sh.style.setProperty("--a1", s.a1.toFixed(3));
            sh.style.setProperty("--a2", s.a2.toFixed(3));
          }
          glRef.current[i]?.style.setProperty("--gl", s.gloss.toFixed(3));

          // step to this slat's far edge, then bend into the next.
          // +z is toward the viewer, so the sheet bulges up off the stack
          x += band * Math.cos(phi);
          z += band * Math.sin(phi);
          phi += s.td;
        }
      },
    }),
    [n],
  );

  return (
    <div
      ref={rootRef}
      className={styles.curl}
      style={{ "--n": n } as CSSProperties}
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className={styles.slat}
          style={{ "--i": i } as CSSProperties}
          ref={(el) => {
            slatRef.current[i] = el;
          }}
        >
          <div className={styles.inner}>{children}</div>
          <div
            className={styles.sh}
            ref={(el) => {
              shRef.current[i] = el;
            }}
          />
          <div
            className={styles.gl}
            ref={(el) => {
              glRef.current[i] = el;
            }}
          />
        </div>
      ))}
    </div>
  );
});
