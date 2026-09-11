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
        <p><strong>Novexa News Desk</strong> is used for stories produced through our standard collaborative process: a story is drafted with the help of an AI writing assistant from verified source material, then reviewed, fact-checked, edited and approved by a member of our editorial team before it is published. It is a byline for the newsroom as a whole, not a named individual.</p>
        <p>Every article credited to Novexa News Desk has passed through the same editorial review as work published under a named author&apos;s byline: sources are checked, claims are verified against the available material, and a person takes responsibility for the story before it goes live. See our <a href="/editorial-policy">Editorial Policy</a> for the full standards this desk follows, including how we handle AI-assisted drafting, sourcing, corrections and independence.</p>
        <AuthorArticles names={["Novexa News Desk"]} />
      </StaticPage>
    </>
  );
}
