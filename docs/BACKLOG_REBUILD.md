# Backlog Rebuild

Rebuilds thin `needs_review` drafts into sourced 600+ word articles and publishes the ones that pass the existing deterministic quality gate.

## Why the backlog exists

`npm run backlog:audit` reported 6,208 drafts held at `needs_review`. Their content is short because the feed importer only ever had RSS metadata to work with: 6,128 of them are under 300 words and 4,178 contain legacy automation filler. The dominant hold reasons are "Article has N words; minimum is N" and "Article contains legacy automation filler".

The fix is not to pad these drafts to 600 words. Padding an RSS blurb means inventing facts, which is what the quality gate exists to prevent. The fix is to retrieve the **original source article** and write a genuinely original piece from that real reporting.

## Source coverage is the limiting factor

The backlog comes from only 11 hosts. Not all of them allow automated retrieval:

| Host | Drafts | Retrievable | Notes |
| --- | ---: | --- | --- |
| tribune.com.pk | 1,701 | Yes | ~82% extraction success |
| bbc.co.uk | 897 | Yes | ~83% |
| theguardian.com | 490 | Yes | ~100% |
| techcrunch.com | 266 | Yes | ~100% |
| nasa.gov + science.nasa.gov | 81 | Yes | ~100%, public domain |
| aljazeera.com | 1,202 | **No** | connection reset at network level |
| dawn.com | 866 | **No** | HTTP 403 |
| nytimes.com | 332 | **No** | HTTP 403, paywalled |
| reddit.com | 308 | **No** | JS-rendered; not a reporting source |
| npr.org | 254 | **No** | request timeout |

**~3,435 drafts are rebuildable. ~2,773 are not.**

The blocked hosts are not worked around. Sending a spoofed browser user agent to a publisher that returns 403 to a declared bot circumvents an access control, and in the NYT case the content is paywalled. Those drafts stay drafts.

## What the rebuild does per article

1. Fetch and extract the source article body (`src/lib/source-extraction.ts`), preferring JSON-LD `articleBody`, falling back to container-scoped `<p>` extraction with boilerplate filtering.
2. Harvest up to 6 **real** authoritative outbound URLs from that page (`.gov`, `.edu`, `.int`, WHO, UN, IMF, Reuters, Nature, and similar). Navigation links, section fronts, and same-organisation links are rejected.
3. Send the full extracted text to OpenAI with a strict JSON schema, requiring 600-950 original words, H2 structure, and inline citations drawn **only** from the harvested allowlist plus the source URL.
4. Discard any link the model emitted whose URL was not on the allowlist, unwrapping it to plain text. A hallucinated URL cannot reach the database.
5. Run the existing `assessArticleQuality` gate with `FEED_MIN_PUBLISH_WORDS=600`.
6. On pass: snapshot the old draft into `articlerevisions`, assign a deduplicated stock image, and publish with `reviewStatus: approved`.
7. On fail: leave it a draft, record `rebuildFailureReason`, and mark `rebuildAttemptedAt` so the next run skips it.

`publishedAt` is set from `sourcePublishedAt`, not the run time. Stamping a month of backlog with today's date would misdate the news and produce a same-day publishing spike.

## Commands

```powershell
npm run backlog:audit                        # read-only backlog report
npm run backlog:probe -- --limit=25           # extraction success sampling
npm run backlog:probe -- --host=dawn.com      # test one host

# dry run (default) - writes nothing
npm run backlog:rebuild -- --limit=25 --hosts=bbc.co.uk,theguardian.com

# inspect full rebuilt text before committing
npm run backlog:rebuild -- --limit=1 --hosts=tribune.com.pk --print

# write to MongoDB and publish
npm run backlog:rebuild -- --limit=200 --hosts=tribune.com.pk --apply

npm run backlog:verify                        # confirm published output passes site gates
```

Flags: `--limit`, `--hosts`, `--category`, `--concurrency` (default 3, max 6), `--host-delay` (default 1500ms between requests to the same host), `--apply`, `--print`, `--retry-failed`.

Runs are resumable. Each processed draft gets `rebuildAttemptedAt`, and subsequent runs skip it unless `--retry-failed` is passed. Every run writes `exports/rebuild-report-<timestamp>.json`.

## Measured throughput

25 articles applied at concurrency 3 took 2m44s, about 6.5s per article, 100% pass rate, 931 average words, 1.0 average external links. Extrapolated to the ~3,435 rebuildable drafts: roughly 6-7 hours of wall clock and about 3,400 OpenAI calls at roughly 4k input and 1.5k output tokens each. Check current model pricing before running the full set.

## Pacing

Do not publish all 3,435 in one day. A site that has 2,852 published articles suddenly adding thousands more in a day is the exact pattern Google's scaled content abuse policy targets, and AdSense review reads the same signal. Publish in daily batches and let indexing catch up.

## Publishing fresh news (`npm run news:latest`)

The same extraction and writing pipeline also runs against live feeds, so new articles arrive at 600+ words with real citations instead of the thin RSS-only drafts that created the backlog.

It pulls every active feed on an extractable host, drops anything already in the database, keeps entries newer than `--max-age-hours` (default 72), and takes a fixed quota per category so the front page stays balanced.

```powershell
npm run news:latest -- --plan                       # selection + extraction only, no model spend
npm run news:latest -- --per-category=2 --print      # full dry run, prints each article
npm run news:latest -- --per-category=2 --apply      # write and publish
npm run news:latest -- --categories=Technology,Sports --per-category=3 --apply
```

Flags: `--per-category`, `--categories`, `--max-age-hours`, `--concurrency` (default 2, max 4), `--plan`, `--print`, `--apply`.

`--plan` is the cheap pre-flight. It stops before the paid model call and reports how many candidates extracted cleanly, which is enough to confirm feeds and extraction are healthy.

A representative plan run found 279 feed entries, 224 of them new, and extracted 14 of 16 selected stories (88%) across World, Business, Football, Space, Startups, Technology, Sports and Pakistan.

## Editorial voice

`src/lib/article-rebuild.ts` carries explicit voice rules, because the first pass produced a giveaway tell: sentences like "the source report says senior executives backed him". A reader must never be able to detect that the writer worked from a supplied document.

The prompt now forbids referring to the brief at all and requires newsroom attribution instead ("the BBC reported", "according to figures released by the ministry"). It also bans the standard AI register - "it is worth noting", "plays a crucial role", "underscores", "sheds light on", "remains to be seen", "in conclusion" - and requires varied sentence length, concrete ledes, and no summarising final paragraph.

## Cost dependency

Both `backlog:rebuild` and `news:latest` require OpenAI credit. When the balance is empty the API returns HTTP 429 `credit_balance_exhausted` and every article is held with that reason. Check with `npm run openai:diagnose` before a long run.
