# Vercel Cron Notes

The cron API routes are ready, but Vercel Hobby only allows cron jobs that run once per day. The original schedule required:

- `/api/cron/feeds` every 10 minutes
- `/api/cron/trending` every 30 minutes
- `/api/cron/refresh` every hour

Those schedules require Vercel Pro or an external scheduler. To keep Hobby deployments working, `vercel.json` does not include the frequent cron entries.

## Option 1: Vercel Pro

If the project is on Vercel Pro, add this back to `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/feeds",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/trending",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/refresh",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Option 2: Vercel Hobby + External Cron

Keep `vercel.json` as-is and use any external scheduler to call these URLs:

```text
https://www.novexa.news/api/cron/feeds      every 10 minutes
https://www.novexa.news/api/cron/trending   every 30 minutes
https://www.novexa.news/api/cron/refresh    every 1 hour
```

Each request must include this header:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

Set the same `CRON_SECRET` value in Vercel Environment Variables.
