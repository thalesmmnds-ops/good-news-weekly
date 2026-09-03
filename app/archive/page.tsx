import type { Metadata } from "next";
import Link from "next/link";

import { getAllIssues } from "@/lib/issues";
import { CATEGORY_LABELS, type Category } from "@/lib/schema";
import { formatWeekOf, toRoman } from "@/lib/dates";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every issue of the Good News Weekly Edition.",
};

export default function ArchivePage() {
  const issues = getAllIssues();

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        &larr; The current Edition
      </Link>
      <div className={styles.panel}>
        <h1 className={styles.title}>Archive</h1>
        <p className={styles.lead}>
          {issues.length} {issues.length === 1 ? "issue" : "issues"} so far.
        </p>
        <ul className={styles.issues}>
          {issues.map((issue) => {
            const cats = [
              ...new Set(issue.stories.map((s) => s.category)),
            ] as Category[];
            return (
              <li key={issue.number}>
                <Link href={`/issues/${issue.number}/`} className={styles.issueRow}>
                  <span className={styles.issueNo}>
                    Vol.&nbsp;{toRoman(issue.volume)} &nbsp;·&nbsp; No.&nbsp;
                    {issue.number}
                  </span>
                  <div className={styles.issueWeek}>{formatWeekOf(issue.weekOf)}</div>
                  <div className={styles.issueCats}>
                    {cats.map((c) => (
                      <span
                        key={c}
                        className="u-caps"
                        style={{ color: `var(--${c})` }}
                      >
                        {CATEGORY_LABELS[c]}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
