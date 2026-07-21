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

type SeedFeed = {
  name: string;
  url: string;
  defaultCategory: string;
  active?: boolean;
  autoPublish?: boolean;
};

const feeds: SeedFeed[] = [
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
  { name: "NASA Breaking News", url: "https://www.nasa.gov/news-release/feed/", defaultCategory: "Space" },
  { name: "Dawn Home", url: "https://www.dawn.com/feeds/home", defaultCategory: "Pakistan" },
  { name: "Dawn Latest", url: "https://www.dawn.com/feeds/latest", defaultCategory: "Pakistan" },
  { name: "Dawn Pakistan", url: "https://www.dawn.com/feeds/pakistan", defaultCategory: "Pakistan" },
  { name: "Dawn World", url: "https://www.dawn.com/feeds/world", defaultCategory: "World" },
  { name: "Dawn Business", url: "https://www.dawn.com/feeds/business", defaultCategory: "Business" },
  { name: "Dawn Sport", url: "https://www.dawn.com/feeds/sport", defaultCategory: "Sports" },
  { name: "Dawn Tech", url: "https://www.dawn.com/feeds/tech", defaultCategory: "Technology" },
  { name: "Express Tribune Latest", url: "https://tribune.com.pk/feed/latest", defaultCategory: "Pakistan", autoPublish: false },
  { name: "Express Tribune Pakistan", url: "https://tribune.com.pk/feed/pakistan", defaultCategory: "Pakistan", autoPublish: false },
  { name: "Express Tribune Business", url: "https://tribune.com.pk/feed/business", defaultCategory: "Business", autoPublish: false },
  { name: "Express Tribune World", url: "https://tribune.com.pk/feed/world", defaultCategory: "World", autoPublish: false },
  { name: "Express Tribune Technology", url: "https://tribune.com.pk/feed/technology", defaultCategory: "Technology", autoPublish: false },
  { name: "Express Tribune Sports", url: "https://tribune.com.pk/feed/sports", defaultCategory: "Sports", autoPublish: false },
  { name: "Express Tribune Cricket", url: "https://tribune.com.pk/feed/cricket", defaultCategory: "Cricket", autoPublish: false },
  { name: "Business Recorder Trends", url: "https://www.brecorder.com/trends/rss", defaultCategory: "Economy", active: false },
  { name: "New York Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", defaultCategory: "World" },
  { name: "New York Times Business", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", defaultCategory: "Business" },
  { name: "New York Times Technology", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", defaultCategory: "Technology" },
  { name: "CNN Top Stories", url: "https://rss.cnn.com/rss/edition.rss", defaultCategory: "World" },
  { name: "CNN World", url: "https://rss.cnn.com/rss/edition_world.rss", defaultCategory: "World" },
  { name: "CNN Business", url: "https://rss.cnn.com/rss/money_news_international.rss", defaultCategory: "Business" },
  { name: "Reddit World News Monitor", url: "https://www.reddit.com/r/worldnews/.rss", defaultCategory: "World", autoPublish: false },
  { name: "Reddit Pakistan Monitor", url: "https://www.reddit.com/r/pakistan/.rss", defaultCategory: "Pakistan", autoPublish: false },
  { name: "Reddit Cricket Monitor", url: "https://www.reddit.com/r/Cricket/.rss", defaultCategory: "Cricket", autoPublish: false },
  { name: "Reddit Technology Monitor", url: "https://www.reddit.com/r/technology/.rss", defaultCategory: "Technology", autoPublish: false },
  { name: "Reddit News Monitor", url: "https://www.reddit.com/r/news/.rss", defaultCategory: "World", autoPublish: false }
];

async function seedFeeds() {
  await mongoose.connect(mongoUri, { dbName: "news_website" });

  let upserted = 0;
  for (const feed of feeds) {
    await FeedSource.findOneAndUpdate(
      { url: feed.url },
      { ...feed, active: feed.active ?? true, autoPublish: feed.autoPublish ?? true },
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




