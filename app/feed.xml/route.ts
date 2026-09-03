import { getAllIssues } from "@/lib/issues";
import { formatWeekOf } from "@/lib/dates";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const issues = getAllIssues();

  const items = issues
    .map((issue) => {
      const link = `${SITE.url}/issues/${issue.number}/`;
      const titles = issue.stories
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((s) => `${s.rank}. ${s.headline}`)
        .join(" — ");
      return `    <item>
      <title>${escape(`No. ${issue.number} — ${formatWeekOf(issue.weekOf)}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(`${issue.published}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(titles)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(SITE.name)}</title>
    <link>${SITE.url}/</link>
    <description>${escape(SITE.tagline)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
