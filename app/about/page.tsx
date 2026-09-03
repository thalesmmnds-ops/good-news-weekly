import type { Metadata } from "next";
import Link from "next/link";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "A weekly edition of ten good things from science, health, nature, and discovery.",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        &larr; The current Edition
      </Link>
      <div className={styles.panel}>
        <h1 className={styles.title}>About the Edition</h1>
        <p className={styles.lead}>
          Ten good things that happened this week, one to a page &mdash; and
          nothing that frightens.
        </p>
        <p>
          <strong>Good News Weekly Edition</strong> collects ten genuine
          advances from the past week in four areas: <strong>science</strong>,{" "}
          <strong>health and medicine</strong>,{" "}
          <strong>conservation and wildlife</strong>, and{" "}
          <strong>discovery</strong> &mdash; new species, new instruments, things
          found. Worldwide, no home-country bias.
        </p>
        <p>
          It deliberately leaves out politics, policy, elections, war, conflict,
          crime, and disaster. Not because those do not matter, but because there
          is already somewhere to read them, and this is not that place.
        </p>
        <p>
          Each week a program gathers candidate stories from a fixed set of
          science and conservation publications, filters anything off-topic or
          alarming, and drafts summaries. An editor picks the final ten, verifies
          each against its primary source, and rewrites every summary in plain
          language. The summaries are short by design; each page links out to the
          publication that did the reporting.
        </p>
        <p>
          New issue every Monday.{" "}
          <Link href="/archive/">Browse the archive</Link> or{" "}
          <a href="/feed.xml">subscribe by RSS</a>.
        </p>
      </div>
    </main>
  );
}
