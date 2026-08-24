import assert from "node:assert/strict";
import test from "node:test";
import { assessArticleQuality, normalizeSourceUrl, textSimilarity, validatePublishReadiness } from "../src/lib/article-quality";
import { scoreFeedCandidate, type FeedEntry } from "../src/lib/feed-ingestion";

test("normalizes source URLs and removes tracking parameters", () => {
  assert.equal(
    normalizeSourceUrl("https://WWW.Example.com/news/story/?utm_source=rss&at_medium=RSS&id=7#section"),
    "https://example.com/news/story?id=7"
  );
});

test("recognizes likely versions of the same story", () => {
  const close = textSimilarity(
    "Central bank holds interest rates after inflation report",
    "Interest rates held by central bank following inflation data"
  );
  const unrelated = textSimilarity(
    "Central bank holds interest rates after inflation report",
    "Football club announces new stadium plans"
  );
  assert.ok(close > 0.45);
  assert.ok(close > unrelated);
  assert.ok(unrelated < 0.2);
});

test("rejects repeated newsroom automation filler", () => {
  const result = assessArticleQuality({
    title: "Officials publish a revised transport timetable",
    content: "The story falls under the public affairs desk. Novexa News will continue watching for updates.",
    metaDescription: "Officials have published a revised transport timetable with updated service information for passengers across the affected routes.",
    sourceTitle: "Transport authority issues updated schedule",
    sourceSummary: "The transport authority published a revised timetable and listed the routes affected by the schedule change. The notice includes implementation dates and passenger guidance for the updated services.",
    sourceUrl: "https://example.com/transport-update"
  });
  assert.equal(result.approved, false);
  assert.ok(result.reasons.some((reason) => reason.includes("automation filler")));
});

test("blocks thin published articles at publish readiness gate", () => {
  const result = validatePublishReadiness({
    status: "published",
    title: "Officials announce a new transport plan",
    slug: "officials-announce-new-transport-plan",
    excerpt: "Officials announced a new transport plan with updated service information for passengers.",
    content: "Officials announced a new transport plan. More details are expected later.",
    category: "Pakistan",
    author: "Novexa News Desk",
    image: "https://res.cloudinary.com/example/image/upload/news.png",
    imageAlt: "Public transport vehicles at a city terminal",
    metaTitle: "Officials Announce New Transport Plan",
    metaDescription: "Officials announced a new transport plan with updated service information, route details and passenger guidance for affected areas.",
    canonicalUrl: "https://www.novexa.news/news/officials-announce-new-transport-plan",
    ogImage: "https://res.cloudinary.com/example/image/upload/news.png",
    generationMode: "manual"
  });

  assert.equal(result.approved, false);
  assert.ok(result.reasons.some((reason) => reason.includes("minimum")));
});

test("allows drafts to remain flexible before publishing", () => {
  const result = validatePublishReadiness({
    status: "draft",
    title: "Working draft",
    content: "Short notes"
  });

  assert.equal(result.approved, true);
});

test("prioritizes relevant trending feed candidates", () => {
  const entry: FeedEntry = {
    title: "Central bank announces an interest-rate decision",
    description: "The central bank published its latest policy decision with supporting inflation and market figures for businesses and households.",
    link: "https://example.com/rates",
    publishedAt: new Date()
  };
  const fallback = scoreFeedCandidate(entry, "Business", {
    primaryKeyword: "central bank interest rates",
    relatedKeywords: [],
    source: "editorial",
    researchedAt: new Date()
  });
  const trending = scoreFeedCandidate(entry, "Business", {
    primaryKeyword: "central bank interest rates",
    relatedKeywords: [],
    source: "google-trends",
    geo: "US",
    approximateTraffic: 100_000,
    researchedAt: new Date()
  });

  assert.ok(trending > fallback + 50);
});
