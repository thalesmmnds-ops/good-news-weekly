import type { Issue, Story } from "@/lib/schema";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatLongDate, formatWeekOf } from "@/lib/dates";

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
          <img src={story.image.src} alt={story.image.alt} />
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
      <hr className={styles.coverRule} />
      <h1 className={styles.coverMark}>
        Good News
        <br />
        <em>Weekly Edition</em>
      </h1>
      <hr className={styles.coverRule} />
      <p className={`${styles.coverMeta} ${styles.caps}`}>
        Vol.&nbsp;{String(issue.volume).padStart(2, "0")} &nbsp;&middot;&nbsp; No.&nbsp;{issue.number}{" "}
        &nbsp;&middot;&nbsp; {formatWeekOf(issue.weekOf)}
      </p>
      <p className={styles.coverTagline}>
        Good things you might have missed this week
      </p>
      <p className={styles.coverNote}>
        A little collection of the good happening around the world. No wars, no
        politics, no crime &mdash; just people, ideas, animals, discoveries, and
        small reasons to feel hopeful.
      </p>
    </div>
  );
}

export function ColophonPage({ side }: { issue: Issue; side: Side }) {
  // left blank for now — a plain white leaf; the "how it's made" note
  // will come back here later
  return <div className={`${styles.inner} ${sideClass(side)} ${styles.blank}`} />;
}
