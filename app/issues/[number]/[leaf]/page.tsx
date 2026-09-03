import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Edition } from "@/components/Edition";
import {
  getAllIssues,
  getIssueByNumber,
  leafCount,
  orderedStories,
} from "@/lib/issues";
import { CATEGORY_LABELS } from "@/lib/schema";

export const dynamicParams = false;

export function generateStaticParams() {
  const params: Array<{ number: string; leaf: string }> = [];
  for (const issue of getAllIssues()) {
    // Leaf 0 is the cover, served by the parent route.
    for (let leaf = 1; leaf < leafCount(issue); leaf++) {
      params.push({ number: String(issue.number), leaf: String(leaf) });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string; leaf: string }>;
}): Promise<Metadata> {
  const { number, leaf } = await params;
  const issue = getIssueByNumber(Number(number));
  if (!issue) return {};
  const stories = orderedStories(issue);
  const story = stories[Number(leaf) - 1];
  if (!story) {
    return { title: `No. ${issue.number} — Colophon` };
  }
  return {
    title: `${story.headline} — No. ${issue.number}`,
    description: `${CATEGORY_LABELS[story.category]}. ${story.dek}`,
  };
}

export default async function LeafPage({
  params,
}: {
  params: Promise<{ number: string; leaf: string }>;
}) {
  const { number, leaf } = await params;
  const issue = getIssueByNumber(Number(number));
  if (!issue) notFound();

  const index = Number(leaf);
  if (!Number.isInteger(index) || index < 1 || index >= leafCount(issue)) {
    notFound();
  }

  return <Edition issue={issue} initialPage={index} />;
}
