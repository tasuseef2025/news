import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "Learn about Novexa News editorial standards, corrections, attribution and AI-assisted publishing approach.",
  alternates: { canonical: absoluteUrl("/editorial-policy") }
};

export default function EditorialPolicyPage() {
  return (
    <StaticPage title="Editorial Policy" description="Our editorial policy explains how Novexa News approaches accuracy, attribution, corrections and responsible AI-assisted publishing." updated="July 20, 2026">
      <h2>Accuracy And Verification</h2>
      <p>Novexa News aims to publish timely and reliable information. Important claims, names, figures and sensitive details should be reviewed against credible sources before heavy promotion.</p>
      <h2>Attribution</h2>
      <p>When stories are based on monitored public feeds or third-party sources, Novexa News includes source attribution and links to the original source where appropriate.</p>
      <h2>AI-Assisted Publishing</h2>
      <p>The platform may use AI-assisted workflows to summarize feed metadata and prepare original drafts. AI output should not copy full publisher articles, invent facts or replace editorial judgment.</p>
      <h2>Corrections</h2>
      <p>If an error is identified, we review correction requests and update content when appropriate. Send correction requests to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> with the article URL and supporting details.</p>
      <h2>Independence</h2>
      <p>Advertising, sponsorship and commercial relationships should not control editorial conclusions or factual reporting.</p>
    </StaticPage>
  );
}
