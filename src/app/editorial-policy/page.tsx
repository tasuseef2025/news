import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "Editorial Policy",
  description: "Learn about Novexa News editorial standards for accuracy, attribution, corrections, authorship, source transparency and independence.",
  path: "/editorial-policy",
  ogImageTitle: "Editorial Policy"
});

export default function EditorialPolicyPage() {
  return (
    <StaticPage title="Editorial Policy" description="Our editorial policy explains how Novexa News approaches accuracy, attribution, corrections, authorship and the use of AI." updated="September 19, 2026">
      <h2>Accuracy And Verification</h2>
      <p>Novexa News aims to publish timely and reliable information. Names, dates, figures, quotations and sensitive claims are checked against the available source material. Stories that do not meet the publication threshold remain unpublished or are sent for editorial review.</p>
      <h2>Sources And Developing Stories</h2>
      <p>We identify the reporting basis for every story and link to the original publisher when we build on another outlet&apos;s work. A later report about the same event is treated as an update or supporting reference, not as a separate story merely to increase publishing volume.</p>
      <h2>Attribution</h2>
      <p>Attribution is not a substitute for permission to reproduce protected work. Novexa News does not intentionally republish another publisher&apos;s complete article, distinctive structure, photographs or other protected material without an appropriate licence.</p>
      <h2>How Our Stories Are Written</h2>
      <p>Some stories are written or materially edited and approved by a person. The Novexa News Desk also uses an automated feed workflow for selected stories: an AI assistant drafts from publisher material, and automated checks assess length, factual support, originality, duplication risk, sourcing and page metadata. Stories that fail those checks are held back. A passing automated story may be published without a person reviewing it first.</p>
      <p>Automated checks cannot guarantee that every claim is correct. We link to the reporting basis and review correction requests. Where the publisher&apos;s article text is accessible, the workflow uses it as the factual basis; otherwise the available feed material may be too limited to support publication.</p>
      <p>Older feed-based articles are being reviewed separately. We correct or retire material that does not meet our current standards.</p>
      <h2>Authorship</h2>
      <p>Named authors are responsible for work they write or materially edit. <a href="/author/novexa-news-desk">Novexa News Desk</a> is an editorial organization byline used for collaborative coverage and qualifying automatically published feed stories; it is not a fictional person. See our <a href="/about">masthead</a> for the people behind Novexa News.</p>
      <h2>Corrections</h2>
      <p>If an error is identified, we review the request and correct the article while preserving its original publication date. Material updates receive a visible updated time. Send correction requests to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> with the article URL and supporting evidence.</p>
      <h2>Independence</h2>
      <p>Advertising, sponsorship and commercial relationships should not control editorial conclusions or factual reporting.</p>
    </StaticPage>
  );
}
