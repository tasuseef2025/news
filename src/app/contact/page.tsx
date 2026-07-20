import type { Metadata } from "next";
import { ContactLink, StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Novexa News for editorial queries, corrections, advertising and partnership requests.",
  alternates: { canonical: absoluteUrl("/contact") }
};

export default function ContactPage() {
  return (
    <StaticPage title="Contact Us" description="Reach the Novexa News team for editorial queries, corrections, advertising, partnerships and general feedback.">
      <h2>Email</h2>
      <p>For all editorial, advertising and business inquiries, contact <ContactLink />.</p>
      <h2>Corrections</h2>
      <p>If you believe a story contains an error, include the article URL, the correction request and any supporting source. Our team reviews correction requests as quickly as possible.</p>
      <h2>Advertising</h2>
      <p>For sponsored placements, display advertising, newsletter partnerships or campaign inquiries, email <a href={`mailto:${siteConfig.contactEmail}?subject=Advertising%20Inquiry%20-%20Novexa%20News`}>{siteConfig.contactEmail}</a>.</p>
      <h2>Response Time</h2>
      <p>We aim to review important editorial and business emails promptly, though response times can vary depending on volume.</p>
    </StaticPage>
  );
}
