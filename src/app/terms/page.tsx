import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Read the terms and conditions for using Novexa News.",
  alternates: { canonical: absoluteUrl("/terms") }
};

export default function TermsPage() {
  return (
    <StaticPage title="Terms and Conditions" description="These terms govern your access to and use of Novexa News." updated="July 20, 2026">
      <h2>Use Of The Website</h2>
      <p>By using Novexa News, you agree to access the website lawfully and not misuse, attack, scrape aggressively, copy, republish or interfere with the platform.</p>
      <h2>Content</h2>
      <p>Articles are provided for general information and news purposes. While we aim for accuracy, fast-moving stories may change as new verified information becomes available.</p>
      <h2>Intellectual Property</h2>
      <p>Novexa News content, branding, design and original materials are protected by applicable intellectual property laws. Third-party source names and links belong to their respective owners.</p>
      <h2>No Professional Advice</h2>
      <p>Information on the site should not be treated as legal, medical, financial or professional advice. Readers should consult qualified professionals when necessary.</p>
      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</p>
    </StaticPage>
  );
}
