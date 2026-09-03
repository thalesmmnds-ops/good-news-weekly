import { z } from "zod";

/**
 * The four beats of the Edition. A story belongs to exactly one.
 * Anything political, violent, criminal, or disaster-driven never
 * makes it this far — the pipeline filters it long before an issue
 * file is written.
 */
export const CATEGORIES = [
  "science",
  "health",
  "conservation",
  "discovery",
] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  science: "Science",
  health: "Health & Medicine",
  conservation: "Conservation & Wildlife",
  discovery: "Discovery",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date, YYYY-MM-DD");

export const sourceSchema = z.object({
  /** Publication the summary links out to, e.g. "Nature". */
  name: z.string().min(1),
  /** Where the reader goes to read the full story. */
  url: z.string().url(),
  /** Publication date of the source article. */
  date: isoDate,
  /** Optional upstream credit when the story reached us via an aggregator. */
  via: z.string().min(1).optional(),
  /** Optional DOI for research-backed items. */
  doi: z.string().min(1).optional(),
});

/**
 * A freely-licensed image for the story's plate. Only public-domain and
 * attribution-only licences are allowed in — never the news outlet's own
 * photo. The pipeline fills this from Openverse / NASA / Wikimedia Commons
 * and always records where it came from.
 */
export const imageSchema = z.object({
  /** Local path under /public (the pipeline downloads and stores it). */
  src: z.string().min(1),
  /** Describes the picture, for screen readers. */
  alt: z.string().min(1),
  /** Optional one-line caption printed under the plate. */
  caption: z.string().max(160).optional(),
  /** Who made it, e.g. "NASA/STScI" or a photographer's name. */
  credit: z.string().min(1),
  creditUrl: z.string().url().optional(),
  /** Short licence label, e.g. "Public domain" or "CC BY 4.0". */
  license: z.string().min(1),
  licenseUrl: z.string().url().optional(),
});

export type StoryImage = z.infer<typeof imageSchema>;

export const storySchema = z.object({
  /** 1–10, unique within an issue, drives running order. */
  rank: z.number().int().min(1).max(10),
  category: categorySchema,
  /** Rewritten in our own words — never the source's exact headline. */
  headline: z.string().min(1).max(140),
  /** One-sentence standfirst. */
  dek: z.string().min(1).max(240),
  /** ~40–55 words of original prose; ~30–40 when the story carries a plate. */
  summary: z.string().min(1),
  /** Optional single line: why this matters beyond the week. */
  whyItMatters: z.string().max(280).optional(),
  /** Optional plate, set between the standfirst and the body. */
  image: imageSchema.optional(),
  source: sourceSchema,
});

export type Story = z.infer<typeof storySchema>;

export const issueSchema = z
  .object({
    /** Continuous issue number, No. 1 upward. */
    number: z.number().int().positive(),
    /** Volume — one per calendar year, Vol. I in the first year. */
    volume: z.number().int().positive(),
    /** Monday of the week the issue covers. */
    weekOf: isoDate,
    /** Date the issue went live. */
    published: isoDate,
    /** Optional two-sentence note from the desk. */
    editorsNote: z.string().max(500).optional(),
    /** Set on draft files the pipeline opens as a PR; removed on merge. */
    draft: z.boolean().optional(),
    /**
     * A launch/demo issue: real evergreen milestones rather than one week's
     * news, so the "this week only" date window is not enforced. The pipeline
     * never sets this.
     */
    sampler: z.boolean().optional(),
    stories: z.array(storySchema).length(10),
  })
  .superRefine((issue, ctx) => {
    const ranks = issue.stories.map((s) => s.rank).sort((a, b) => a - b);
    const expected = Array.from({ length: 10 }, (_, i) => i + 1);
    if (ranks.join() !== expected.join()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stories must carry each rank 1–10 exactly once",
      });
    }

    // The Edition comes out on a Thursday and covers the previous complete
    // week (Mon–Sun). So the issue is published a few days after that week
    // ends, and every source article appeared within it — with a little slack
    // for an embargoed study whose write-up lands slightly early or late.
    if (!issue.sampler) {
      const DAY = 86_400_000;
      const monday = Date.parse(`${issue.weekOf}T00:00:00Z`);
      const published = Date.parse(`${issue.published}T00:00:00Z`);

      if (published < monday + 6 * DAY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `published ${issue.published} is before the week of ${issue.weekOf} has ended`,
        });
      }
      if (published > monday + 24 * DAY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `published ${issue.published} is more than three weeks after the week it covers`,
        });
      }

      const from = monday - 2 * DAY;
      const to = monday + 9 * DAY;
      for (const story of issue.stories) {
        const d = Date.parse(`${story.source.date}T00:00:00Z`);
        if (d < from || d > to) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `story ${story.rank}: source dated ${story.source.date} is outside the week of ${issue.weekOf}`,
          });
        }
      }
    }
  });

export type Issue = z.infer<typeof issueSchema>;
