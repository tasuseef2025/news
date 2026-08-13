import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  const body = `# ${siteConfig.name}

${siteConfig.description}

Novexa News is a digital news publication founded by ${siteConfig.founder}. It publishes original newsroom briefs, article summaries, and editorial coverage across Pakistan, world news, business, technology, finance, sports, entertainment, health, lifestyle, education, opinion, and live scores.

Primary site: ${absoluteUrl("/")}
RSS feed: ${absoluteUrl("/rss.xml")}
Sitemap: ${absoluteUrl("/sitemap.xml")}
Google News sitemap: ${absoluteUrl("/news-sitemap.xml")}
Search: ${absoluteUrl("/search")}
Editorial policy: ${absoluteUrl("/editorial-policy")}
Privacy policy: ${absoluteUrl("/privacy-policy")}
About: ${absoluteUrl("/about")}
Contact: ${absoluteUrl("/contact")}
Author: ${absoluteUrl("/author/abdul-basit")}
Editor and author: ${absoluteUrl("/author/syeda-manal-tirmizi")}

Attribution and copyright policy:
Novexa News articles generated from monitored public feeds are written in original wording and include source attribution. The site does not claim ownership of third-party source reporting, publisher images, or external media. Risky publisher images should be replaced with generated Novexa OpenGraph images unless licensed use is confirmed.

Recommended citation:
Use Novexa News as the publisher and link to the original article URL on www.novexa.news.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
