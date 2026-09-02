import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "Careers and Contributor Opportunities at Novexa News",
  description: "Explore editorial, contributor, technology, SEO and media partnership opportunities with Novexa News as we build a modern digital publishing platform.",
  path: "/careers",
  ogImageTitle: "Novexa News Careers"
});

export default function CareersPage() {
  return (
    <StaticPage title="Careers" description="Novexa News is building a modern digital publishing platform for fast, reliable and accessible news.">
      <h2>Current Opportunities</h2>
      <p>We are not listing formal vacancies at this time, but we welcome interest from writers, editors, contributors, developers, SEO specialists and media partners.</p>
      <h2>What We Value</h2>
      <p>We value accuracy, clarity, speed, ethical publishing, strong technical execution and curiosity about the future of digital media.</p>
      <h2>Contact</h2>
      <p>To introduce yourself, email <a href={`mailto:${siteConfig.contactEmail}?subject=Careers%20-%20Novexa%20News`}>{siteConfig.contactEmail}</a> with your background, portfolio and area of interest.</p>
    </StaticPage>
  );
}
