import type { Issue } from "@/lib/schema";
import { orderedStories } from "@/lib/issues";

import { CoverLeaf } from "./CoverLeaf";
import { StoryLeaf } from "./StoryLeaf";
import { ColophonLeaf } from "./ColophonLeaf";
import { LeafStack } from "./LeafStack";

export function Edition({
  issue,
  initialLeaf = 0,
}: {
  issue: Issue;
  initialLeaf?: number;
}) {
  const stories = orderedStories(issue);

  const leaves = [
    <CoverLeaf key="cover" issue={issue} />,
    ...stories.map((story) => (
      <StoryLeaf key={story.rank} story={story} total={stories.length} />
    )),
    <ColophonLeaf key="colophon" issue={issue} />,
  ];

  return (
    <LeafStack
      leaves={leaves}
      initialIndex={initialLeaf}
      basePath={`/issues/${issue.number}`}
      storyCount={stories.length}
    />
  );
}
