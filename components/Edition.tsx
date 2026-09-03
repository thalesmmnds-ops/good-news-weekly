import type { Issue } from "@/lib/schema";
import { orderedStories } from "@/lib/issues";

import { Book, type BookPage } from "./Book";
import { ColophonPage, CoverPage, StoryPage } from "./pages";

export function buildPages(issue: Issue): BookPage[] {
  const stories = orderedStories(issue);
  const total = stories.length;

  const pages: BookPage[] = [
    { node: <CoverPage issue={issue} side="left" />, label: "Cover" },
  ];

  stories.forEach((story, i) => {
    const side = (i + 1) % 2 === 0 ? "left" : "right";
    pages.push({
      node: <StoryPage story={story} total={total} side={side} />,
      label: String(story.rank),
    });
  });

  const colophonSide = pages.length % 2 === 0 ? "left" : "right";
  pages.push({
    node: <ColophonPage issue={issue} side={colophonSide} />,
    label: "Colophon",
  });

  return pages;
}

export function Edition({
  issue,
  initialPage = 0,
}: {
  issue: Issue;
  initialPage?: number;
}) {
  return (
    <Book
      pages={buildPages(issue)}
      initialPage={initialPage}
      basePath={`/issues/${issue.number}`}
    />
  );
}
