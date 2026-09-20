import assert from "node:assert/strict";

const baseUrl = "https://www.novexa.news";
const expectedAuthor = "Syeda Manal Tirmizi";
const articles = [
  {
    slug: "sohail-afridi-calls-review-foreign-security-policy",
    title: "KP Chief Minister Afridi Calls for Review of Foreign and Security Policy"
  },
  {
    slug: "ishaq-dar-new-york-81st-unga-agenda",
    title: "Ishaq Dar Leaves for New York With Wide-Ranging UNGA Agenda"
  },
  {
    slug: "houthi-rebels-attack-riyadh",
    title: "Houthis Claim Missile and Drone Attacks on Riyadh and Yanbu"
  }
];

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getText(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
    headers: { "user-agent": "NovexaEditorialVerifier/1.0" }
  });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return { text: await response.text(), contentType: response.headers.get("content-type") || "" };
}

async function main() {
  const results = [];
  for (const article of articles) {
    const url = `${baseUrl}/news/${article.slug}`;
    const { text: html, contentType } = await getText(url);
    const decoded = decodeHtml(html);
    assert(contentType.includes("text/html"), `${article.slug}: not HTML`);
    assert(decoded.includes(article.title), `${article.slug}: title missing from public HTML`);
    assert(decoded.includes(expectedAuthor), `${article.slug}: author missing from public HTML`);
    assert(decoded.includes(`<link rel="canonical" href="${url}"`), `${article.slug}: canonical missing`);
    assert(!/<meta[^>]+(?:name|property)=["']robots["'][^>]+noindex/i.test(html), `${article.slug}: noindex found`);
    assert(decoded.includes('"@type":"NewsArticle"') || decoded.includes('"@type": "NewsArticle"'), `${article.slug}: NewsArticle schema missing`);
    assert(decoded.includes('"name":"Syeda Manal Tirmizi"') || decoded.includes('"name": "Syeda Manal Tirmizi"'), `${article.slug}: schema author missing`);

    const imageMatch = decoded.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      || decoded.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    assert(imageMatch?.[1], `${article.slug}: og:image missing`);
    const imageResponse = await fetch(imageMatch[1], { signal: AbortSignal.timeout(30000) });
    assert(imageResponse.ok, `${article.slug}: image HTTP ${imageResponse.status}`);
    assert(imageResponse.headers.get("content-type")?.startsWith("image/"), `${article.slug}: image content type invalid`);
    await imageResponse.arrayBuffer();

    results.push({ slug: article.slug, status: 200, canonical: url, author: expectedAuthor, imageStatus: imageResponse.status });
  }

  const [{ text: sitemap }, { text: newsSitemap }, { text: authorHtml }] = await Promise.all([
    getText(`${baseUrl}/sitemap.xml`),
    getText(`${baseUrl}/news-sitemap.xml`),
    getText(`${baseUrl}/author/syeda-manal-tirmizi`)
  ]);
  for (const article of articles) {
    assert(sitemap.includes(`/news/${article.slug}`), `${article.slug}: absent from main sitemap`);
    assert(newsSitemap.includes(`/news/${article.slug}`), `${article.slug}: absent from news sitemap`);
    assert(decodeHtml(authorHtml).includes(article.title), `${article.slug}: absent from author archive`);
  }

  console.log(JSON.stringify({
    verification: "passed",
    articles: results,
    mainSitemap: "all three present",
    newsSitemap: "all three present",
    authorArchive: "all three present"
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
