import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { issueSchema, type Issue } from "./schema";

const ISSUES_DIR = join(process.cwd(), "content", "issues");

let cache: Issue[] | null = null;

function loadAll(): Issue[] {
  if (cache) return cache;

  let files: string[] = [];
  try {
    files = readdirSync(ISSUES_DIR).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".draft.json"),
    );
  } catch {
    files = [];
  }

  const issues = files.map((file) => {
    const raw = JSON.parse(readFileSync(join(ISSUES_DIR, file), "utf8"));
    const parsed = issueSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `content/issues/${file} failed validation:\n${parsed.error.toString()}`,
      );
    }
    return parsed.data;
  });

  // Drafts never reach the built site.
  const published = issues
    .filter((issue) => !issue.draft)
    .sort((a, b) => b.number - a.number);

  cache = published;
  return published;
}

/** All published issues, newest first. */
export function getAllIssues(): Issue[] {
  return loadAll();
}

/** The current issue — what "/" shows. */
export function getLatestIssue(): Issue | null {
  return loadAll()[0] ?? null;
}

export function getIssueByNumber(number: number): Issue | null {
  return loadAll().find((issue) => issue.number === number) ?? null;
}

/** Ordered stories for an issue, rank 1 -> 10. */
export function orderedStories(issue: Issue) {
  return [...issue.stories].sort((a, b) => a.rank - b.rank);
}

/**
 * Leaves in an issue: cover, one per story, colophon.
 * Index 0 is the cover; index stories.length + 1 is the colophon.
 */
export function leafCount(issue: Issue): number {
  return issue.stories.length + 2;
}
