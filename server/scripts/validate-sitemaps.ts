import "dotenv/config";
import { writeFileSync } from "fs";

type UrlFinding = { url: string; issue: string; detail?: string };
type ParsedUrl = { loc: string; publicationDate?: string; title?: string };

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.novexa.news").replace(/\/$/, "");
const limitArg = process.argv.find((item) => item.startsWith("--limit="));
const checkLimit = limitArg ? Math.max(0, Number(limitArg.slice(8))) : 0;
const outputArg = process.argv.find((item) => item.startsWith("--output="))?.slice(9);

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function tags(block: string, name: string) {
  return [...block.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "gi"))]
    .map((match) => decodeXml(match[1].trim()));
}

function parseSitemap(xml: string) {
  const structuralErrors: string[] = [];
  if (!/^<\?xml\s+version=["']1\.0["']/i.test(xml.trim())) structuralErrors.push("Missing XML declaration");
  if (!/<urlset\b/i.test(xml) || !/<\/urlset>\s*$/i.test(xml.trim())) structuralErrors.push("Missing or unclosed urlset root");
  if ((xml.match(/<url>/g) || []).length !== (xml.match(/<\/url>/g) || []).length) structuralErrors.push("Unbalanced url elements");
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/i.test(xml)) structuralErrors.push("Unescaped ampersand detected");
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);
  const urls: ParsedUrl[] = blocks.map((block) => ({
    loc: tags(block, "loc")[0] || "",
    publicationDate: tags(block, "news:publication_date")[0],
    title: tags(block, "news:title")[0]
  }));
  if (urls.some((item) => !item.loc)) structuralErrors.push("One or more URL entries have no loc");
  return { structuralErrors: [...new Set(structuralErrors)], urls };
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "NovexaSitemapValidator/1.0" }, redirect: "manual" });
  return { response, text: await response.text() };
}

async function checkUrl(url: string): Promise<UrlFinding[]> {
  const findings: UrlFinding[] = [];
  try {
    const response = await fetch(url, { headers: { "User-Agent": "NovexaSitemapValidator/1.0" }, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) findings.push({ url, issue: "redirect", detail: response.headers.get("location") || "" });
    else if (response.status === 404 || response.status === 410) findings.push({ url, issue: String(response.status) });
    else if (!response.ok) findings.push({ url, issue: `HTTP ${response.status}` });
    if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
      const html = await response.text();
      if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) findings.push({ url, issue: "noindex" });
      const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
      if (!canonical) findings.push({ url, issue: "missing canonical" });
      else if (canonical.replace(/\/$/, "") !== url.replace(/\/$/, "")) findings.push({ url, issue: "non-canonical", detail: canonical });
    }
  } catch (error) {
    findings.push({ url, issue: "fetch failed", detail: error instanceof Error ? error.message : String(error) });
  }
  return findings;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

async function run() {
  const [normalResult, newsResult] = await Promise.all([
    fetchText(`${baseUrl}/sitemap.xml`),
    fetchText(`${baseUrl}/news-sitemap.xml`)
  ]);
  const normal = parseSitemap(normalResult.text);
  const news = parseSitemap(newsResult.text);
  const findings: UrlFinding[] = [];
  const normalLocs = normal.urls.map((item) => item.loc);
  const newsLocs = news.urls.map((item) => item.loc);
  const normalSet = new Set(normalLocs);

  for (const [kind, locs] of [["normal", normalLocs], ["news", newsLocs]] as const) {
    const seen = new Set<string>();
    for (const loc of locs) {
      if (seen.has(loc)) findings.push({ url: loc, issue: `duplicate ${kind} sitemap URL` });
      seen.add(loc);
      try {
        const parsed = new URL(loc);
        if (parsed.protocol !== "https:") findings.push({ url: loc, issue: "non-HTTPS URL" });
        if (parsed.origin !== new URL(baseUrl).origin) findings.push({ url: loc, issue: "foreign hostname" });
        if (parsed.search || parsed.hash) findings.push({ url: loc, issue: "query or fragment in sitemap URL" });
      } catch {
        findings.push({ url: loc, issue: "invalid URL" });
      }
    }
  }
  for (const item of news.urls) {
    if (!normalSet.has(item.loc)) findings.push({ url: item.loc, issue: "News URL missing from normal sitemap" });
    if (!item.publicationDate) findings.push({ url: item.loc, issue: "missing news publication date" });
    else {
      const published = new Date(item.publicationDate);
      if (!Number.isFinite(published.getTime())) findings.push({ url: item.loc, issue: "invalid news publication date" });
      else if (published < new Date(Date.now() - 48 * 60 * 60 * 1000)) findings.push({ url: item.loc, issue: "article older than 48 hours in News sitemap" });
      else if (published > new Date(Date.now() + 5 * 60 * 1000)) findings.push({ url: item.loc, issue: "future news publication date" });
    }
    if (!item.title) findings.push({ url: item.loc, issue: "missing news title" });
  }

  const checkedUrls = checkLimit > 0 ? normalLocs.slice(0, checkLimit) : normalLocs;
  findings.push(...(await mapConcurrent(checkedUrls, 8, checkUrl)).flat());
  const report = {
    generatedAt: new Date().toISOString(), mode: "read-only", baseUrl,
    normalSitemap: { status: normalResult.response.status, urls: normal.urls.length, structuralErrors: normal.structuralErrors },
    newsSitemap: { status: newsResult.response.status, urls: news.urls.length, structuralErrors: news.structuralErrors },
    checkedUrls: checkedUrls.length, findingsCount: findings.length, findings
  };
  if (outputArg) writeFileSync(outputArg, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, output: outputArg || null }, null, 2));
  if (normal.structuralErrors.length || news.structuralErrors.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
