# Feed Ingestion

The project can import latest posts from RSS/Atom feeds and turn them into MongoDB articles.

## Where The APIs Live

- `src/app/api/feed-sources/route.ts` manages feed sources.
- `src/app/api/feeds/ingest/route.ts` imports latest feed entries and creates articles.
- `src/lib/feed-ingestion.ts` contains parsing, image extraction, categorization, AI rewriting, fallback rewriting, and summary generation.
- Imported articles use the normal `Article` model, so they automatically appear on the homepage, latest lists, related sections, and their category page.

## Add A Feed Source

```http
POST /api/feed-sources
Content-Type: application/json

{
  "name": "Example News",
  "url": "https://example.com/rss.xml",
  "defaultCategory": "World",
  "active": true,
  "autoPublish": true
}
```

Requires `create_articles` permission.

## Import Latest Feed Items

Import one source:

```http
POST /api/feeds/ingest
Content-Type: application/json

{
  "sourceId": "SOURCE_MONGODB_ID"
}
```

Import all active sources:

```http
POST /api/feeds/ingest
Content-Type: application/json
{}
```

Requires `publish_articles` permission.

## What Happens Automatically

- Reads RSS/Atom feed entries.
- Extracts title, link, description, published date, category, and image.
- Falls back to page `og:image` / `twitter:image` when the feed has no usable image.
- Uses OpenAI rewriting when `OPENAI_API_KEY` is configured.
- Uses a local non-repetitive article generator when OpenAI is not configured.
- Auto-detects the closest site category.
- Generates slug, meta title, meta description, canonical URL, reading time, OG image, and structured data.
- Saves the article as `published` when `autoPublish` is true, otherwise as `draft`.
- Prevents duplicates using `sourceUrl`.

## AI Rewriting

Feed imports can optionally use OpenAI to produce a more natural, copyright-safe original article from feed metadata.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
FEED_AI_MAX_OUTPUT_TOKENS=1200
```

If `OPENAI_API_KEY` is missing, the importer uses a local non-repetitive fallback article generator.

## Copyright And Editorial Safety

The importer is intentionally designed not to copy full publisher articles. It rewrites from feed metadata, avoids invented facts, includes source attribution, and links to the original source. Editors should still review important stories and comply with each publisher's terms and robots policies.
