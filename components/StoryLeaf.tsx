import type { Story } from "@/lib/schema";
import { formatLongDate } from "@/lib/dates";

import { CategoryKicker } from "./CategoryKicker";
import styles from "./Leaves.module.css";

export function StoryLeaf({ story, total }: { story: Story; total: number }) {
  const { source } = story;
  return (
    <div className={styles.leafInner}>
      <header className={styles.storyHead}>
        <span className={`${styles.rank} u-tnum`}>
          {String(story.rank).padStart(2, "0")}
        </span>
        <div className={styles.headMeta}>
          <CategoryKicker category={story.category} />
          <h2 className={styles.headline}>{story.headline}</h2>
        </div>
      </header>

      <div className={styles.storyBody}>
        <p className={styles.dek}>{story.dek}</p>
        <p className={styles.summary}>{story.summary}</p>
        {story.whyItMatters ? (
          <p className={styles.why}>
            <span className={`${styles.whyLabel} u-caps`}>Why it matters</span>
            <span>{story.whyItMatters}</span>
          </p>
        ) : null}
      </div>

      <footer className={styles.storyFoot}>
        <span>
          <a
            className={styles.sourceLink}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the full story at {source.name}
          </a>{" "}
          &rarr;
          {source.via ? (
            <span className={styles.sourceVia}> &nbsp;·&nbsp; via {source.via}</span>
          ) : null}
        </span>
        <span className="u-caps u-tnum">
          {story.rank}&nbsp;/&nbsp;{total}
          <span className={styles.sourceVia}>
            {" "}
            &nbsp;·&nbsp; {formatLongDate(source.date)}
          </span>
        </span>
      </footer>
    </div>
  );
}
