# API Reference

All API routes are implemented with Next.js Route Handlers under `src/app/api` and use MongoDB.

## Content

- `GET /api/articles` - published articles with pagination/category filters
- `POST /api/articles` - create article, requires `create_articles`
- `GET /api/articles/[id]` - admin article detail, requires `create_articles`
- `PATCH /api/articles/[id]` - update article, requires `create_articles`; publish/schedule requires `publish_articles`
- `DELETE /api/articles/[id]` - delete article, requires `delete_articles`
- `GET /api/articles/latest`
- `GET /api/articles/popular`
- `GET /api/articles/related?slug=...`
- `GET /api/articles/recommended`
- `GET /api/articles/infinite?cursor=...`
- `POST /api/articles/trending` - update trending posts, requires analytics permission

## Taxonomy

- `GET /api/categories`
- `POST /api/categories` - requires `manage_categories`
- `GET /api/tags`
- `POST /api/tags` - requires article creation permission

## Users And Authors

- `GET /api/users` - requires `manage_users`
- `POST /api/users` - requires `manage_users`
- `GET /api/authors`
- `POST /api/authors` - requires `manage_users`

## Engagement

- `GET /api/comments`
- `POST /api/comments`
- `PATCH /api/comments` - moderator/admin access
- `GET /api/bookmarks`
- `POST /api/bookmarks`
- `DELETE /api/bookmarks`
- `GET /api/likes`
- `POST /api/likes`
- `DELETE /api/likes`
- `GET /api/views`
- `POST /api/views`

## Platform

- `GET /api/search?q=...`
- `GET /api/search/suggestions?q=...`
- `GET /api/advertisements`
- `POST /api/advertisements` - requires `manage_ads`
- `PATCH /api/advertisements` - requires `manage_ads`
- `GET /api/newsletter` - requires analytics permission
- `POST /api/newsletter`
- `DELETE /api/newsletter`
- `GET /api/media` - requires article creation permission
- `POST /api/media` - requires article creation permission
- `GET /api/analytics` - requires analytics permission
- `GET /api/analytics/web-vitals` - requires analytics permission
- `POST /api/analytics/web-vitals`
- `GET /api/health`

## Generated SEO

- `GET /sitemap.xml`
- `GET /news-sitemap.xml`
- `GET /rss.xml`
- `GET /robots.txt`
- `GET /api/og?title=...&category=...`

## Feed Ingestion

- `GET /api/feed-sources` - list feed sources, requires article creation permission
- `POST /api/feed-sources` - create RSS/Atom source, requires article creation permission
- `PATCH /api/feed-sources` - update RSS/Atom source, requires article creation permission
- `POST /api/feeds/ingest` - import latest feed entries into MongoDB articles, requires publish permission
