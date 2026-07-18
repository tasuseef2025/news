# Novexa News

A production-ready news website built with Next.js 15 App Router, React 19, TypeScript, MongoDB, NextAuth, Tailwind CSS, and REST APIs.

## Features

- Server-rendered newspaper homepage
- Dynamic article, category, SEO, sitemap, RSS, robots, and Google News routes
- Role-based authentication and permissions
- Article management system with publishing workflow
- Admin dashboard with analytics, activity, tables, and notifications
- MongoDB-backed REST APIs for articles, categories, users, comments, tags, search, ads, newsletter, authors, media, bookmarks, likes, and views
- Cloudinary upload endpoint
- Web Vitals capture
- Docker-ready standalone Next.js build
- Scheduled feed import, trending updates, and SEO refresh automation

## Getting Started

```bash
npm install
copy .env.example .env
npm run validate:env
npm run dev
```

Create the first full-access account:

```bash
npm run seed:admin
```

## Quality Gates

```bash
npm run typecheck
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Feed Ingestion](docs/FEED_INGESTION.md)
- [Automation](docs/AUTOMATION.md)
- [Vercel Cron Notes](docs/VERCEL_CRON.md)
- [Live Scores](docs/LIVE_SCORES.md)
