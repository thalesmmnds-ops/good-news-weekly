# Good News Weekly Edition

A weekly web "edition" of exactly **ten** genuinely good stories — presented as
paper leaves you flip through, one story to a page.

**Beat:** Science · Health & Medicine · Conservation & Wildlife · Discovery.
Worldwide.
**Never:** politics, policy, elections, war, conflict, crime, disaster, or
fear-framed stories.

---

## Stack

- **Next.js 16** (App Router) with `output: "export"` — the whole site is static
  HTML/CSS/JS, no server at runtime.
- Content is **JSON files in the repo**, one per issue, validated with **Zod**.
  Merging an issue file is the editorial "publish" step; git history is the
  archive.
- The page-turn is a hand-rolled critically-damped spring driving a CSS 3D
  rotation — no animation library.
- Deploys on **Vercel**.

## Layout

```
app/
  page.tsx                     latest issue (the cover)
  issues/[number]/page.tsx     an issue, opened at the cover
  issues/[number]/[leaf]/      a single story (or the colophon) — deep-linkable
  archive/  about/             prose pages
  feed.xml/route.ts            RSS 2.0 of all issues (force-static)
components/
  Edition.tsx                  assembles an issue's leaves
  LeafStack.tsx                the turn: spring, drag zones, keyboard, ticks
  CoverLeaf / StoryLeaf / ColophonLeaf
content/issues/*.json          the editions
lib/
  schema.ts   Zod schema + the four categories
  issues.ts   load / validate / sort issues
  dates.ts    formatting + roman numerals
  site.ts     name, tagline, canonical URL
```

Drafts the pipeline opens as a PR are named `*.draft.json` and are ignored by
the site until renamed.

## Develop

```bash
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
npm run lint
```

## Content model

Each `content/issues/<year>-W<week>.json`:

```jsonc
{
  "number": 1,          // continuous, No. 1 upward
  "volume": 1,          // one per calendar year
  "weekOf": "2026-08-31",   // the Monday this issue covers
  "published": "2026-09-03",
  "sampler": true,      // optional: a launch/demo issue, exempt from the date window
  "stories": [
    {
      "rank": 1,                       // 1..10, each used once
      "category": "health",            // science | health | conservation | discovery
      "headline": "rewritten in our own words",
      "dek": "one-sentence standfirst",
      "summary": "~40–55 words of original prose, not an excerpt",
      "whyItMatters": "optional single line",
      "image": { /* optional plate — see schema */ },
      "source": {
        "name": "The New England Journal of Medicine",
        "url": "https://…",
        "date": "2026-09-01",          // must fall in the covered week
        "via": "Science",             // optional aggregator credit
        "doi": "10.1056/NEJMoa2407001" // optional
      }
    }
    // …ten total
  ]
}
```

`npm run build` fails loudly if an issue file breaks the schema. It's a
**weekly**: every story's `source.date` must land from 3 days before the
covered Monday to 10 days after it. A `sampler` issue is exempt — that's what
the launch demo uses.

## Roadmap

- [x] **M1** Identity + a static sample issue
- [x] **M2** The page-turn — spring, drag, keyboard, reduced-motion, deep links
- [x] **M3** Schema, loader, archive, about, RSS
- [ ] **M3.1** Per-issue Open Graph images (`opengraph-image.tsx`)
- [ ] **M4** Weekly pipeline — `pipeline/`: pull the last 7 days from a fixed set
      of science/conservation feeds, LLM filters the blocklist + ranks + drafts
      (+ finds a freely-licensed plate per story), writes `*.draft.json` +
      `REVIEW.md`, GitHub Action opens a PR
- [ ] **M5** Polish — snapshot-based page curl, zoom/loupe, analytics

## Editorial policy

Summaries are original and short. Every page links out to the publication that
did the reporting. No article bodies are reproduced; no third-party photographs
are hosted. Nothing about politics or violence, by design.
