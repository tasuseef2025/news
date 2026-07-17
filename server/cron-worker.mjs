const baseUrl = process.env.CRON_BASE_URL || process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is required for cron worker.");
  process.exit(1);
}

const jobs = [
  { name: "Import feeds", path: "/api/cron/feeds", intervalMs: 10 * 60 * 1000, runImmediately: true },
  { name: "Update trending posts", path: "/api/cron/trending", intervalMs: 30 * 60 * 1000, runImmediately: true },
  { name: "Refresh SEO routes", path: "/api/cron/refresh", intervalMs: 60 * 60 * 1000, runImmediately: false }
];

async function runJob(job) {
  const startedAt = new Date();
  try {
    const response = await fetch(`${baseUrl}${job.path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` }
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[cron] ${job.name} failed ${response.status}: ${text}`);
      return;
    }
    console.log(`[cron] ${job.name} completed at ${startedAt.toISOString()}: ${text}`);
  } catch (error) {
    console.error(`[cron] ${job.name} failed:`, error);
  }
}

for (const job of jobs) {
  if (job.runImmediately) {
    void runJob(job);
  }
  setInterval(() => void runJob(job), job.intervalMs);
  console.log(`[cron] Scheduled ${job.name} every ${Math.round(job.intervalMs / 60000)} minutes.`);
}
