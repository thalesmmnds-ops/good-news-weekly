import type { Issue } from "@/lib/schema";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatWeekOf, toRoman } from "@/lib/dates";

import styles from "./Leaves.module.css";

export function CoverLeaf({ issue }: { issue: Issue }) {
  return (
    <div className={`${styles.leafInner} ${styles.cover}`}>
      <div className={styles.coverTop}>
        <hr className={styles.coverRule} />
        <h1 className={styles.coverWordmark}>
          Good News
          <br />
          <em>Weekly Edition</em>
        </h1>
        <hr className={styles.coverRule} />
        <div className={`${styles.coverLine} u-caps u-tnum`}>
          <span>Vol.&nbsp;{toRoman(issue.volume)}</span>
          <span>No.&nbsp;{issue.number}</span>
          <span>{formatWeekOf(issue.weekOf)}</span>
        </div>
      </div>

      <div className={styles.coverBody}>
        <p className={styles.coverTagline}>
          Ten good things that happened this week.
        </p>
        <div className={styles.coverCats}>
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
            (key) => (
              <span
                key={key}
                className="u-caps"
                style={{ color: `var(--${key})` }}
              >
                {CATEGORY_LABELS[key]}
              </span>
            ),
          )}
        </div>
        {issue.editorsNote ? (
          <p className={styles.coverNote}>{issue.editorsNote}</p>
        ) : null}
      </div>

      <div className={`${styles.coverFoot} u-caps`}>
        Turn the page &rarr;
      </div>
    </div>
  );
}
