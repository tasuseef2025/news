# Automation

The project has protected cron endpoints for scheduled publishing automation.

## Schedule

- Every 10 minutes: `GET /api/cron/feeds` imports active RSS/Atom feed sources and creates MongoDB articles.
- Every 30 minutes: `GET /api/cron/trending` recalculates trending posts from published article views.
- Every 1 hour: `GET /api/cron/refresh` revalidates the site shell and warms sitemap, Google News sitemap, RSS, and robots routes.

All cron endpoints require `CRON_SECRET` through an `Authorization: Bearer <secret>` header.

## Local Development

Start the site:

```bash
npm run dev
```

In another terminal, start the worker:

```bash
npm run cron:worker
```

The worker runs feed import and trending update immediately, then continues on the configured intervals.

## Vercel

`vercel.json` already contains the schedules. In Vercel Project Settings, add the same environment variables from `.env.example`, especially:

```env
CRON_SECRET=your-32-plus-character-secret
NEXTAUTH_URL=https://www.novexa.news
```

After deployment, Vercel calls the cron endpoints automatically.

## Docker / EC2

Docker Compose includes a separate `cron` service that calls the web service internally with:

```env
CRON_BASE_URL=http://web:3000
```

For EC2 without Docker, run the web app and cron worker as two processes:

```bash
npm run start
npm run cron:worker
```

Use PM2, systemd, or your process manager to keep both processes alive.

## Feed Sources

Create active feed sources first; otherwise the 10-minute import has nothing to import.

```http
POST /api/feed-sources
Content-Type: application/json

{
  "name": "BBC World",
  "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
  "defaultCategory": "World",
  "active": true,
  "autoPublish": true
}
```

Imported posts are stored as normal `Article` documents, so they appear on the homepage, category pages, latest news, related articles, RSS, and sitemap routes.
