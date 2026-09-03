import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Edition } from "@/components/Edition";
import { getAllIssues, getIssueByNumber } from "@/lib/issues";
import { formatWeekOf } from "@/lib/dates";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllIssues().map((issue) => ({ number: String(issue.number) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const issue = getIssueByNumber(Number(number));
  if (!issue) return {};
  return {
    title: `No. ${issue.number} — ${formatWeekOf(issue.weekOf)}`,
    description: `Ten good things from the week of ${formatWeekOf(issue.weekOf)}.`,
  };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const issue = getIssueByNumber(Number(number));
  if (!issue) notFound();
  return <Edition issue={issue} />;
}
