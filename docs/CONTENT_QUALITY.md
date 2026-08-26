# Content Quality And SEO Operations

## Publishing pipeline

Feed imports now follow this order:

1. Normalize the source URL and retain RSS GUID/item identity.
2. Skip an unchanged source item before calling OpenAI.
3. Compare recent same-category headlines for likely versions of the same story.
4. Hold cross-source matches as `needs_review` drafts linked to the existing story.
5. Research topic language, then request a fact-bounded editorial package from OpenAI.
6. Run deterministic checks for source sufficiency, length, headline match, copied titles, repeated paragraphs, automation filler, metadata, originality, factual confidence and duplicate risk.
7. Publish only when the model and deterministic gate both approve the article and the daily limit permits it.
8. Preserve the canonical slug and original `publishedAt` when an existing source item is materially updated. A revision snapshot is stored first.

Failed or uncertain content remains a draft and is excluded from public article queries, category pages, RSS, sitemaps and trending calculations when its review status is rejected.

## Configuration

The quality thresholds are documented in `.env.example`. Start with the defaults and adjust them only after reviewing audit results. Increasing output volume by lowering quality thresholds is not recommended.

## Read-only audits

```powershell
npm run seo:audit -- --output=exports/seo-audit.csv --format=csv
npm run content:audit
npm run sitemap:validate -- --limit=50 --output=exports/sitemap-validation.json
```

These commands do not modify MongoDB. The SEO audit classifies every published record as `KEEP`, `IMPROVE`, `REVIEW`, `CONSOLIDATE`, or `REMOVE` and reports metadata, content, byline, duplicate, canonical, image, markup, and review-state findings. The sitemap validator checks XML structure and a bounded sample of submitted URLs for redirects, error responses, `noindex`, and canonical mismatches. Omit `--limit` to request every sitemap URL.

## Legacy migration

Preview the backward-compatible metadata backfill:

```powershell
npm run seo:migrate
```

The command is dry-run by default. It reports changes without writing them. After reviewing a database backup and the report, apply with:

```powershell
npm run seo:migrate -- --apply --limit=100
```

Repeat the limited command after checking each batch. Omit `--limit` only when you are ready to process every remaining record. The migration does not change slugs, publication dates, article status or content. It backfills normalized source identity, hashes, canonical URLs, import/update timestamps and review status.

## Legacy cleanup policy

- Do not bulk-delete or redirect duplicate stories automatically.
- Review exact/similar title groups and choose the strongest canonical article.
- Merge only verified, useful facts and preserve the canonical article's original publication date.
- Add redirects before retiring a duplicate URL.
- Keep source attribution and revision history.
- Review thin categories before adding them back to the XML sitemap. Categories need at least two published articles to be included.

## Search-engine behavior

- Article canonicals always use `/news/{slug}` on the configured site origin.
- Search, auth, admin and API utility routes are not intended for indexing.
- Unknown category slugs return 404.
- Thin category archives are `noindex,follow` and are omitted from the sitemap.
- The Google News sitemap contains reviewed articles published in the last 48 hours.
- Structured data uses `Organization` for Novexa News Desk and `Person` for named authors.
- A short article is not automatically low quality. Public indexing uses a small absolute safety floor while the audit checks completeness, repetition, placeholders, prompt leakage, attribution, and metadata separately.
- View counts and trending recalculation do not change an article's editorial `updatedAt` date.
