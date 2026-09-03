export const SITE = {
  name: "Good News Weekly Edition",
  tagline:
    "Ten good things that happened this week, in science, health, nature, and discovery.",
  // Set NEXT_PUBLIC_SITE_URL in the Vercel project once the domain is known.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://good-news-weekly.vercel.app").replace(
    /\/$/,
    "",
  ),
} as const;
