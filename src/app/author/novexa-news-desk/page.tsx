import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { AuthorArticles } from "@/components/static/author-articles";
import { absoluteUrl } from "@/lib/utils";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "Novexa News Desk - Editorial Team",
  description: "Novexa News Desk is the byline for collaborative newsroom coverage at Novexa News, drafted with AI assistance from verified sources and reviewed and approved by a human editor before publication.",
  path: "/author/novexa-news-desk",
  ogImageTitle: "Novexa News Desk",
  ogCategory: "Author"
});

export const revalidate = 300;

export default function NovexaNewsDeskAuthorPage() {
  const profileUrl = absoluteUrl("/author/novexa-news-desk");
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Novexa News Desk",
    url: profileUrl,
    parentOrganization: { "@type": "NewsMediaOrganization", name: "Novexa News", url: absoluteUrl("/") },
    description: "Collaborative newsroom byline used for stories drafted with AI assistance and reviewed by a human editor."
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <StaticPage
        eyebrow="Author"
        title="Novexa News Desk"
        description="The byline for collaborative newsroom coverage at Novexa News."
      >
        <p><strong>Novexa News Desk</strong> is a newsroom byline, not a named individual. It covers both collaborative reporting and selected feed-based stories drafted with AI assistance and published after automated checks.</p>
        <p>Some Desk articles receive human review before publication; others do not. Feed-based stories must pass checks for sourcing, factual support, originality, duplication and page quality before going live. See our <a href="/editorial-policy">Editorial Policy</a> for more detail and how to request a correction.</p>
        <AuthorArticles names={["Novexa News Desk"]} />
      </StaticPage>
    </>
  );
}
