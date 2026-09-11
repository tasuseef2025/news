/**
 * audit-homepage.js
 *
 * Diagnostic-only script. It does NOT modify anything, it fetches the live
 * homepage and reports, with hard numbers, exactly which of the flagged
 * issues are still present. Use it before/after a frontend fix to confirm
 * the fix actually landed.
 *
 * This script makes a plain HTTP request to a public URL and parses the
 * returned HTML - it does not touch the database, so no .env/MONGODB_URI
 * is needed to run it.
 *
 * USAGE:
 *   npm install cheerio
 *   node audit-homepage.js https://www.novexa.news
 */

const cheerio = require("cheerio");

const URL_TO_CHECK = process.argv[2] || "https://www.novexa.news";

async function main() {
  console.log(`Auditing: ${URL_TO_CHECK}\n`);
  const res = await fetch(URL_TO_CHECK);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // ---------------------------------------------------------------------
  // 1. Duplicate article link blocks
  //    Strategy: collect every <a> href that points to /news/... and check
  //    for hrefs that appear more than twice (once in a "latest" strip and
  //    once in a "recent articles" footer is often legitimate, but if the
  //    SAME href appears back-to-back in the same list, that's the bug).
  // ---------------------------------------------------------------------
  const articleLinks = [];
  $('a[href*="/news/"]').each((_, el) => {
    articleLinks.push($(el).attr("href"));
  });

  const counts = {};
  articleLinks.forEach((href) => {
    counts[href] = (counts[href] || 0) + 1;
  });

  const heavilyDuplicated = Object.entries(counts)
    .filter(([, count]) => count >= 3) // appearing 3+ times on one page is suspicious
    .sort((a, b) => b[1] - a[1]);

  console.log("=== 1. Duplicate article links (appearing 3+ times) ===");
  if (heavilyDuplicated.length === 0) {
    console.log("None found, looks clean.\n");
  } else {
    heavilyDuplicated.forEach(([href, count]) =>
      console.log(`  ${count}x  ${href}`)
    );
    console.log(
      `\n  -> ${heavilyDuplicated.length} links repeated 3+ times. If your "Latest" strip is meant to show ~10 unique stories, check whether the array feeding it is being rendered twice (duplicate .map() call, or the component being mounted twice in the tree).\n`
    );
  }

  // ---------------------------------------------------------------------
  // 2. Language switcher - check how many advertised languages actually
  //    resolve to a different, non-English page.
  // ---------------------------------------------------------------------
  console.log("=== 2. Language switcher check ===");
  const langLinks = [];
  $("a, li, option").each((_, el) => {
    const text = $(el).text().trim();
    if (
      [
        "Urdu", "Arabic", "Hindi", "Bengali", "Punjabi", "Persian", "Turkish",
        "French", "German", "Spanish", "Italian", "Portuguese", "Russian",
        "Chinese", "Japanese", "Korean",
      ].includes(text)
    ) {
      const href = $(el).attr("href") || $(el).attr("value") || $(el).find("a").attr("href");
      langLinks.push({ text, href: href || "(no href/value found)" });
    }
  });

  if (langLinks.length === 0) {
    console.log("No language menu items detected.\n");
  } else {
    console.log(`Found ${langLinks.length} language items in the switcher.`);
    console.log(
      "Sample hrefs/values (check manually whether these resolve to real translated pages or 404/redirect back to English):"
    );
    langLinks.slice(0, 6).forEach((l) => console.log(`  ${l.text}: ${l.href}`));
    console.log(
      "\n  -> If these have no href, or all point to '/', the switcher is decorative and should either be removed or wired up to real localized routes.\n"
    );
  }

  // ---------------------------------------------------------------------
  // 3. Match Centre / live scores widget - check for the empty state text.
  // ---------------------------------------------------------------------
  console.log("=== 3. Match Centre widget ===");
  const bodyText = $("body").text();
  const emptyStatePhrases = [
    "No recent football matches are available",
    "No recent matches",
    "Market data is unavailable right now",
  ];
  const foundEmpty = emptyStatePhrases.filter((p) => bodyText.includes(p));
  console.log(
    foundEmpty.length
      ? `  Found empty-state text: ${foundEmpty.map((p) => `"${p}"`).join(", ")}. Check the network tab / server logs for the underlying API request status code.\n`
      : "  No empty-state text detected, looks like it's populated.\n"
  );

  // ---------------------------------------------------------------------
  // 4. Hotlinked external image domains vs. your own CDN
  // ---------------------------------------------------------------------
  console.log("=== 4. Image hosting ===");
  const imgDomains = {};
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    try {
      const host = new URL(src, URL_TO_CHECK).hostname;
      imgDomains[host] = (imgDomains[host] || 0) + 1;
    } catch (e) {
      /* ignore malformed */
    }
  });
  console.log("Image count by hosting domain:");
  Object.entries(imgDomains)
    .sort((a, b) => b[1] - a[1])
    .forEach(([host, count]) => console.log(`  ${count}x  ${host}`));
  console.log(
    "\n  -> Domains like images.pexels.com / images.unsplash.com are generic stock photo hotlinks. res.cloudinary.com or your own domain indicates owned/optimized imagery. Aim to shift the ratio toward the latter.\n"
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
