import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "Learn about Novexa News editorial standards for accuracy, attribution, corrections, authorship, source transparency and independence.",
  alternates: { canonical: absoluteUrl("/editorial-policy") }
};

export default function EditorialPolicyPage() {
  return (
    <StaticPage title="Editorial Policy" description="Our editorial policy explains how Novexa News approaches accuracy, attribution, corrections and authorship." updated="September 3, 2026">
      <h2>Accuracy And Verification</h2>
      <p>Novexa News aims to publish timely and reliable information. Names, dates, figures, quotations and sensitive claims are checked against the available source material. Stories that do not meet the publication threshold remain unpublished or are sent for editorial review.</p>
      <h2>Sources And Developing Stories</h2>
      <p>We identify the reporting basis for every story and link to the original publisher when we build on another outlet&apos;s work. A later report about the same event is treated as an update or supporting reference, not as a separate story merely to increase publishing volume.</p>
      <h2>Attribution</h2>
      <p>Attribution is not a substitute for permission to reproduce protected work. Novexa News does not intentionally republish another publisher&apos;s complete article, distinctive structure, photographs or other protected material without an appropriate licence.</p>
      <h2>How Our Stories Are Written</h2>
      <p>Novexa News articles are written by our editorial team. We do not auto-publish stories generated from news feeds, and no article reaches the site without a person writing or editing it and taking responsibility for it. Automated checks still run before publication, but they only test what a writer has already produced: they measure factual support, originality and duplication risk, and they hold a story back for review rather than publishing one on their own.</p>
      <p>Before 19 August 2026 the site did publish articles drafted automatically from monitored public feeds. That practice has stopped. Some of that material remains in our archive while we review it, and we are rewriting or retiring it rather than leaving it to stand as current work.</p>
      <h2>Authorship</h2>
      <p>Named authors are responsible for work they write or materially edit. Novexa News Desk is used for collaborative newsroom coverage and is represented as an editorial organization, not a fictional person.</p>
      <h2>Corrections</h2>
      <p>If an error is identified, we review the request and correct the article while preserving its original publication date. Material updates receive a visible updated time. Send correction requests to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> with the article URL and supporting evidence.</p>
      <h2>Independence</h2>
      <p>Advertising, sponsorship and commercial relationships should not control editorial conclusions or factual reporting.</p>
    </StaticPage>
  );
}
