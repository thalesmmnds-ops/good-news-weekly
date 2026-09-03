import Link from "next/link";

import type { Issue } from "@/lib/schema";
import { formatLongDate } from "@/lib/dates";

import styles from "./Leaves.module.css";

export function ColophonLeaf({ issue }: { issue: Issue }) {
  return (
    <div className={`${styles.leafInner} ${styles.colophon}`}>
      <h2 className={styles.colophonTitle}>How this Edition is made</h2>

      <div className={styles.colophonBody}>
        <p className={styles.pledge}>
          &ldquo;No politics. No fear. Just the week&rsquo;s genuine progress.&rdquo;
        </p>
        <p>
          Every Sunday a small program reads the week&rsquo;s science, medicine,
          and conservation reporting from a fixed set of sources, sets aside
          anything about politics, conflict, crime, or disaster, and drafts the
          strongest candidates. An editor then chooses the final ten, checks each
          against its primary source, and rewrites every summary in plain words.
        </p>
        <p>
          <strong>Sources this week:</strong>{" "}
          {issue.stories.map((s, i) => (
            <span key={s.rank}>
              {i > 0 ? "; " : ""}
              <a href={s.source.url} target="_blank" rel="noopener noreferrer">
                {s.source.name}
              </a>
            </span>
          ))}
          .
        </p>
        <p>
          Summaries are original and deliberately brief. For the full reporting,
          follow the link on each page to the publication that did the work.
        </p>
        <p>
          <Link href="/archive/">Browse past issues</Link> &nbsp;·&nbsp;{" "}
          <Link href="/about/">About the Edition</Link> &nbsp;·&nbsp;{" "}
          <a href="/feed.xml">RSS</a>
        </p>
      </div>

      <div className={`${styles.colophonFoot} u-caps`}>
        No.&nbsp;{issue.number} &nbsp;·&nbsp; Published {formatLongDate(issue.published)}
      </div>
    </div>
  );
}
