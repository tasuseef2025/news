import "dotenv/config";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/news_website";

const feedSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true, index: true },
    defaultCategory: { type: String, default: "Breaking News", index: true },
    active: { type: Boolean, default: true, index: true },
    autoPublish: { type: Boolean, default: true },
    lastFetchedAt: Date
  },
  { timestamps: true }
);

const FeedSource = mongoose.models.FeedSource || mongoose.model("FeedSource", feedSourceSchema);

const feeds = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", defaultCategory: "World" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", defaultCategory: "Business" },
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", defaultCategory: "Technology" },
  { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", defaultCategory: "Science" },
  { name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", defaultCategory: "Health" },
  { name: "BBC Entertainment", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", defaultCategory: "Entertainment" },
  { name: "BBC Sports", url: "https://feeds.bbci.co.uk/sport/rss.xml", defaultCategory: "Sports" },
  { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", defaultCategory: "Politics" },
  { name: "Al Jazeera Latest", url: "https://www.aljazeera.com/xml/rss/all.xml", defaultCategory: "World" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", defaultCategory: "World" },
  { name: "NPR Business", url: "https://feeds.npr.org/1006/rss.xml", defaultCategory: "Business" },
  { name: "NPR Technology", url: "https://feeds.npr.org/1019/rss.xml", defaultCategory: "Technology" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", defaultCategory: "World" },
  { name: "The Guardian Business", url: "https://www.theguardian.com/uk/business/rss", defaultCategory: "Business" },
  { name: "The Guardian Technology", url: "https://www.theguardian.com/uk/technology/rss", defaultCategory: "Technology" },
  { name: "The Guardian Football", url: "https://www.theguardian.com/football/rss", defaultCategory: "Football" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", defaultCategory: "Startups" },
  { name: "NASA Breaking News", url: "https://www.nasa.gov/news-release/feed/", defaultCategory: "Space" }
];

async function seedFeeds() {
  await mongoose.connect(mongoUri, { dbName: "news_website" });

  let upserted = 0;
  for (const feed of feeds) {
    await FeedSource.findOneAndUpdate(
      { url: feed.url },
      { ...feed, active: true, autoPublish: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  const active = await FeedSource.countDocuments({ active: true });
  await mongoose.disconnect();
  console.log(`Feed sources ready. Upserted: ${upserted}. Active: ${active}.`);
}

seedFeeds().catch((error) => {
  console.error(error);
  process.exit(1);
});
