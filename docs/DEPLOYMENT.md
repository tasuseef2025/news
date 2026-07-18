# Deployment

## Environment

Required variables:

```env
NEXTAUTH_URL=https://www.novexa.news
NEXTAUTH_SECRET=replace-with-a-32-plus-character-secret
MONGODB_URI=mongodb+srv://...
CRON_SECRET=replace-with-a-32-plus-character-cron-secret
CRON_BASE_URL=https://www.novexa.news
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

`CRON_BASE_URL` is optional for Vercel. For Docker Compose it is set to `http://web:3000` so the cron container can call the web container.

Validate before deployment:

```bash
npm run validate:env
npm run typecheck
npm run build
```

## Vercel

1. Set all environment variables in Vercel Project Settings, including `CRON_SECRET`.
2. Use the default Next.js build command: `npm run build`.
3. Deploy.
4. Seed the first admin from a secure terminal with the production environment loaded: `npm run seed:admin`.
5. The schedules in `vercel.json` run feed imports every 10 minutes, trending updates every 30 minutes, and SEO refresh every hour.

## Docker

```bash
docker build -t newsroom .
docker run --env-file .env -p 3000:3000 newsroom
```

Local full stack, including the cron worker:

```bash
docker compose up --build
```

## AWS EC2

1. Install Node.js 22 and MongoDB access, or use MongoDB Atlas.
2. Clone the repository.
3. Create `.env` from `.env.example`.
4. Run `npm ci`, `npm run validate:env`, and `npm run build`.
5. Start `npm run start` behind Nginx or a process manager.
6. Start `npm run cron:worker` as a second long-running process.
7. Point health checks at `/api/health`.

## Health Check

`GET /api/health` returns service and MongoDB connectivity status.
