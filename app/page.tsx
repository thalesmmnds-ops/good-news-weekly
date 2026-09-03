import { notFound } from "next/navigation";

import { Edition } from "@/components/Edition";
import { getLatestIssue } from "@/lib/issues";

export default function HomePage() {
  const issue = getLatestIssue();
  if (!issue) notFound();
  return <Edition issue={issue} />;
}
