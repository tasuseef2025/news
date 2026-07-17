# Feed Ingestion

The project can import latest posts from RSS/Atom feeds and turn them into MongoDB articles.

## Where The APIs Live

- `src/app/api/feed-sources/route.ts` manages feed sources.
- `src/app/api/feeds/ingest/route.ts` imports latest feed entries and creates articles.
- `src/lib/feed-ingestion.ts` contains parsing, image extraction, categorization, and summary generation.
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
- Falls back to page `og:image` when the feed has no image.
- Generates an original summary and article body with source attribution.
- Auto-detects the closest site category.
- Generates slug, meta title, meta description, canonical URL, reading time, OG image, and structured data.
- Saves the article as `published` when `autoPublish` is true, otherwise as `draft`.
- Prevents duplicates using `sourceUrl`.

## Copyright And Editorial Safety

The importer creates brief original summaries with attribution. It does not copy full source articles. Editors should review sources and comply with each publisher's terms and robots policies.
