# Crawl and indexing audit: September 8, 2026

## What was verified

Read-only database inspection, the September 7 Search Console indexed-URL export, live HTTP checks, and the local rendering and sitemap implementation were compared. No articles were published, deleted, or rewritten, no ingestion cron was triggered, and no paid generation API was used.

The supplied graphs show crawling and impressions falling around August 1. They do not identify the exact cause. The findings below are current obstacles, not proof of a specific Google algorithm update or historical server outage.

## Findings

| Check | Result |
| --- | --- |
| Export size | 1,000 URLs, including 992 article URLs |
| Article URLs whose database state implies 404 | 657: 655 drafts, one archived record, one missing record |
| Other exported URLs with local redirects | Three; all three still return 404 in production |
| Exported article URLs expected to return 200 | 332; 329 pass the local indexing checks and three do not |
| Published records in the database | 2,437 |
| Published records passing local indexing checks | 1,141 |
| Published records failing local indexing checks | 1,296 |
| Live robots.txt | 200; public news crawling is allowed |
| Homepage and latest archive | 200, populated HTML, no noindex |
| Eight sampled recent articles | 200, self-canonical, no noindex |
| Eight sampled unavailable exported articles | All return 404 |
| Latest article with a Googlebot user-agent string | 200 with article HTML; this does not verify access from Google's actual IP addresses |
| Main sitemap before changes | 200; 1,139 URLs |
| News sitemap before changes | 200; 16 URLs, all absent from the main sitemap |
| Exact normalized content duplicates among reachable published records | None found; near-duplicates were not ruled out |

The 657 count is a database-based classification, not an individual HTTP check of every URL or proof that Google still indexes every URL today. The source export is dated September 7.

Many published records fail more than one check. Missing editorial approval affects 1,167 records, an unapproved generation mode affects 1,139, and content that describes the automated writing process affects 684. Local checks cannot establish factual accuracy or guarantee Google's quality assessment.

There are 3,043 records carrying an August 4 quarantine timestamp. Some have since been recovered. This is evidence of a large historical content-state change, but the screenshot's decline appears to start earlier; the quarantine cannot be asserted as the cause of the initial decline.

## Code changes

- Include recent approved stories in the main sitemap immediately, while retaining the separate 48-hour News sitemap.
- Use editorial `contentUpdatedAt`, falling back to original publication time, for article sitemap dates, Open Graph modification dates, and visible update dates. General database maintenance must not make a story appear freshly rewritten.
- Record `contentUpdatedAt` when the admin API materially edits a story. Query updates bypass the model's pre-save hook.
- Propagate database failures from homepage and article listings instead of returning successful empty content. A failed ISR regeneration should preserve the previous successful page rather than replace it with an empty edition.
- Add regression tests for sitemap overlap, editorial dates, and failure handling.

Existing publication, duplicate, and quality safeguards were not relaxed. The three pending local redirect entries were already present before this audit and were not changed.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed, including all 133 prerendered pages. Linting is disabled by the existing Next.js configuration and was not run.
- `node --import tsx --test tests/crawl-signals.test.ts tests/article-quality.test.ts`: 22 tests passed.
- The built app was briefly served on a free local port against the connected database: both sitemaps returned 200, the main sitemap contained 1,192 URLs, and all 13 then-current News URLs were included in it. The test server was stopped afterwards. These are time-specific local-build results, not evidence of deployment.
- No production deployment was performed.

## Recovery order

1. Deploy the code through the Vercel account that owns `newswebsite`. The currently authenticated CLI team exposes only another project, so no Novexa deployment or historical production-log review was possible in this session.
2. After deployment, verify the three existing redirects and check that fresh eligible URLs appear in both sitemaps.
3. Review the unavailable-URL CSV. Restore accurate, useful articles at their original URLs where editorially justified. Preserve original publication dates and record substantive updates separately. Use permanent redirects only for genuinely equivalent replacement stories, not unrelated categories or the homepage.
4. Review published-but-noindex content individually. Do not merely change approval flags, add filler to reach a word count, or bulk republish old feed snippets.
5. Submit the updated sitemap in Search Console and inspect a few repaired high-value URLs with its live test. Check host status and crawl response-code breakdown around July 31 to August 5 to investigate the original decline.
6. Track indexing and impressions for repaired URLs separately from new articles. Neither more publishing nor more crawling guarantees clicks.

## Evidence files

- `exports/crawl-recovery-audit.json`: database summary and per-exported-URL classification.
- `exports/indexed-unavailable.csv`: 657 unavailable exported article URLs for editorial recovery.
- `exports/crawl-live-samples.json`: current HTTP and metadata checks, including the three undeployed redirects.
- `exports/sitemap-validation-2026-09-08-before.json`: live sitemap baseline. Its 35-URL sample is not a full-site validation.
- `exports/sitemap-local-after.json`: built-app sitemap overlap verification.

These local exports are audit artifacts, not files that need to be served publicly.

## Google documentation

- [News sitemap requirements](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap): the two-day window applies to News entries, not the complete general sitemap.
- [Sitemap best practices](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): use canonical URLs and meaningful modification dates.
- [Requesting recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl): recrawling can take days to weeks and does not guarantee indexing.
