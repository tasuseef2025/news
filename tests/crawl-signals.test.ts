import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import mongoose from "mongoose";
import { Article } from "../src/models/Article";
import { GET as sitemap } from "../src/app/sitemap.xml/route";
import { GET as newsSitemap } from "../src/app/news-sitemap.xml/route";
import { getHomepageData } from "../src/lib/homepage";
import { getArticles } from "../src/lib/articles";

afterEach(() => mock.restoreAll());

function connected() {
  mock.method(mongoose, "connect", async () => mongoose);
}

test("both sitemaps include a newly published approved story; lastmod ignores maintenance writes", async () => {
  connected();
  const publishedAt = new Date(Date.now() - 3_600_000);
  const contentUpdatedAt = new Date(Date.now() - 1_800_000);
  const rows = [{
    title: "Transit authority announces additional bus services", slug: "additional-bus-services",
    category: "Pakistan", status: "published", reviewStatus: "approved", generationMode: "manual",
    content: Array.from({ length: 12 }, (_, i) => `Route ${i + 1} will receive additional buses during the morning commuter period.`).join(" "),
    image: "https://images.example.com/bus.jpg", publishedAt, contentUpdatedAt,
    updatedAt: new Date()
  }];
  const query = {
    select() { return this; }, sort() { return this; }, limit() { return this; },
    async lean() { return rows; }
  };
  mock.method(Article, "find", () => query);
  const normal = await (await sitemap()).text();
  const news = await (await newsSitemap()).text();
  assert.match(normal, /<loc>https:\/\/[^<]+\/news\/additional-bus-services<\/loc>/);
  assert.match(news, /<loc>https:\/\/[^<]+\/news\/additional-bus-services<\/loc>/);
  assert.ok(normal.includes(`<lastmod>${contentUpdatedAt.toISOString()}</lastmod>`));
  assert.ok(!normal.includes(rows[0].updatedAt.toISOString()));
  assert.ok(news.includes(`<news:publication_date>${publishedAt.toISOString()}</news:publication_date>`));
});

test("legacy stories use their publication date when no editorial update is recorded", async () => {
  connected();
  const publishedAt = new Date("2026-07-01T12:00:00Z");
  const query = {
    select() { return this; }, sort() { return this; }, limit() { return this; },
    async lean() { return [{
      title: "Transit schedule published", slug: "transit-schedule", category: "Pakistan",
      status: "published", reviewStatus: "approved", generationMode: "manual",
      content: Array.from({ length: 12 }, (_, i) => `Route ${i + 1} runs twice every hour during the daytime timetable.`).join(" "),
      publishedAt, updatedAt: new Date()
    }]; }
  };
  mock.method(Article, "find", () => query);
  const xml = await (await sitemap()).text();
  assert.ok(xml.includes(`<lastmod>${publishedAt.toISOString()}</lastmod>`));
});

test("database failure cannot be returned as a successful empty homepage or listing", async () => {
  connected();
  mock.method(Article, "updateMany", async () => { throw new Error("Test database outage"); });
  await assert.rejects(getHomepageData(), /Homepage content is temporarily unavailable/);
  await assert.rejects(getArticles(), /Article listings are temporarily unavailable/);
});
