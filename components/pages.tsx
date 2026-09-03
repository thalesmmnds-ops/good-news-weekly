import Link from "next/link";

import type { Issue, Story } from "@/lib/schema";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatLongDate, formatWeekOf, toRoman } from "@/lib/dates";

import styles from "./Pages.module.css";

type Side = "left" | "right";

function sideClass(side: Side) {
  return side === "left" ? styles.spineRight : styles.spineLeft;
}

export function StoryPage({
  story,
  total,
  side,
}: {
  story: Story;
  total: number;
  side: Side;
}) {
  const { source } = story;
  return (
    <div className={`${styles.inner} ${sideClass(side)}`}>
      <span className={styles.rank}>{String(story.rank).padStart(2, "0")}</span>
      <span
        className={`${styles.kicker} ${styles.caps}`}
        style={{ color: `var(--${story.category})` }}
      >
        {CATEGORY_LABELS[story.category]}
      </span>
      <h2 className={styles.headline}>{story.headline}</h2>

      <p className={styles.dek}>{story.dek}</p>

      {story.image ? (
        <figure className={styles.plate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.image.src} alt={story.image.alt} loading="lazy" />
          <figcaption className={styles.plateCap}>
            {story.image.caption ? <span>{story.image.caption} </span> : null}
            <span className={styles.plateCredit}>
              {story.image.creditUrl ? (
                <a
                  className={styles.sourceLink}
                  href={story.image.creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {story.image.credit}
                </a>
              ) : (
                story.image.credit
              )}
              {" · "}
              {story.image.license}
            </span>
          </figcaption>
        </figure>
      ) : null}

      <div className={styles.body}>
        <p style={{ margin: 0 }}>{story.summary}</p>
        {story.whyItMatters ? (
          <span className={styles.why}>
            <b>Why it matters</b>
            {story.whyItMatters}
          </span>
        ) : null}
      </div>

      <div className={styles.foot}>
        <a
          className={styles.sourceLink}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the full story at {source.name}
        </a>{" "}
        &rarr;
        <span className={styles.folio}>
          {story.rank} / {total} &nbsp;·&nbsp; {formatLongDate(source.date)}
          {source.via ? ` · via ${source.via}` : ""}
        </span>
      </div>
    </div>
  );
}

export function CoverPage({ issue, side }: { issue: Issue; side: Side }) {
  return (
    <div className={`${styles.inner} ${sideClass(side)} ${styles.cover}`}>
      <div style={{ width: "100%" }}>
        <hr className={styles.coverRule} />
        <h1 className={styles.coverMark}>
          Good News
          <br />
          <em>Weekly Edition</em>
        </h1>
        <hr className={styles.coverRule} />
        <div className={`${styles.coverMeta} ${styles.caps}`}>
          <span>Vol.&nbsp;{toRoman(issue.volume)}</span>
          <span>No.&nbsp;{issue.number}</span>
          <span>{formatWeekOf(issue.weekOf)}</span>
        </div>
      </div>

      <p className={styles.coverTagline}>
        Ten good things that happened this week.
      </p>

      <div className={styles.coverCats}>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
          (key) => (
            <span
              key={key}
              className={styles.caps}
              style={{ color: `var(--${key})` }}
            >
              {CATEGORY_LABELS[key]}
            </span>
          ),
        )}
      </div>

      {issue.editorsNote ? (
        <p className={styles.coverNote}>{issue.editorsNote}</p>
      ) : (
        <span />
      )}
    </div>
  );
}

export function ColophonPage({ issue, side }: { issue: Issue; side: Side }) {
  return (
    <div className={`${styles.inner} ${sideClass(side)}`}>
      <h2 className={styles.colTitle}>How this Edition is made</h2>
      <p className={styles.pledge}>
        &ldquo;No politics. No fear. Just the week&rsquo;s genuine progress.&rdquo;
      </p>
      <div className={styles.colBody}>
        <p>
          Every Sunday a program reads the week&rsquo;s science, medicine, and
          conservation reporting from a fixed set of sources, sets aside anything
          about politics, conflict, crime, or disaster, and drafts the strongest
          candidates. An editor picks the final ten, checks each against its
          primary source, and rewrites every summary in plain words.
        </p>
        <p>
          Summaries are original and brief. Each page links out to the
          publication that did the reporting.
        </p>
        <p>
          <Link href="/archive/">Past issues</Link> &nbsp;·&nbsp;{" "}
          <Link href="/about/">About</Link> &nbsp;·&nbsp;{" "}
          <a href="/feed.xml">RSS</a>
        </p>
      </div>
      <div className={`${styles.foot} ${styles.caps}`}>
        No.&nbsp;{issue.number} &nbsp;·&nbsp; {formatLongDate(issue.published)}
      </div>
    </div>
  );
}
