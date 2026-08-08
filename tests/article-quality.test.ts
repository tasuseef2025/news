import assert from "node:assert/strict";
import test from "node:test";
import { assessArticleQuality, normalizeSourceUrl, textSimilarity } from "../src/lib/article-quality";

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
