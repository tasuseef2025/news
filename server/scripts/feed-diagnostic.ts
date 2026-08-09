import "dotenv/config";
import mongoose from "mongoose";

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });

  const db = mongoose.connection.db;
  const feeds = db.collection("feedsources");
  const articles = db.collection("articles");
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const last48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [sources, recentArticles, dailyPublished, dailyAi, statusGroups, latest] = await Promise.all([
    feeds.find({}).project({ name: 1, active: 1, autoPublish: 1, defaultCategory: 1, lastFetchedAt: 1, updatedAt: 1 }).sort({ name: 1 }).toArray(),
    articles.countDocuments({ createdAt: { $gte: last48Hours } }),
    articles.countDocuments({ status: "published", originalSourceUrl: { $exists: true, $ne: "" }, createdAt: { $gte: startOfDay } }),
    articles.countDocuments({ aiAttemptedAt: { $gte: startOfDay } }),
    articles.aggregate([
      { $match: { createdAt: { $gte: last48Hours } } },
      { $group: { _id: { status: "$status", reviewStatus: "$reviewStatus", generationMode: "$generationMode" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray(),
    articles.find({ createdAt: { $gte: last48Hours } }).project({
      title: 1, slug: 1, status: 1, reviewStatus: 1, generationMode: 1, rejectionReasons: 1,
      qualityScore: 1, originalityScore: 1, factualConfidence: 1, duplicateRisk: 1,
      sourceName: 1, aiAttemptedAt: 1, aiFailureReason: 1, createdAt: 1, publishedAt: 1
    }).sort({ createdAt: -1 }).limit(30).toArray()
  ]);

  const configured = {
    openAi: Boolean(process.env.OPENAI_API_KEY),
    aiEnabled: process.env.FEED_AI_ENABLED !== "false",
    aiCategories: process.env.FEED_AI_CATEGORIES || "Pakistan,World,Politics,Business,Economy,Technology,Artificial Intelligence,Sports,Health",
    openAiModel: process.env.OPENAI_MODEL || null,
    importLimit: Number(process.env.FEED_IMPORT_LIMIT || 3),
    dailyPublishLimit: Number(process.env.FEED_DAILY_PUBLISH_LIMIT || 12),
    dailyAiLimit: Number(process.env.FEED_AI_DAILY_LIMIT || 20),
    runAiLimit: Number(process.env.FEED_AI_RUN_LIMIT || 3),
    minimumWords: Number(process.env.FEED_MIN_PUBLISH_WORDS || 500),
    minimumSourceCharacters: Number(process.env.FEED_MIN_SOURCE_CHARS || 180)
  };

  console.log(JSON.stringify({
    checkedAt: now.toISOString(),
    database: db.databaseName,
    configuration: configured,
    sources: {
      total: sources.length,
      active: sources.filter((source) => source.active).length,
      autoPublish: sources.filter((source) => source.active && source.autoPublish).length,
      items: sources
    },
    last48Hours: { created: recentArticles, groups: statusGroups },
    today: { publishedFromFeeds: dailyPublished, aiAttempts: dailyAi },
    latest
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
