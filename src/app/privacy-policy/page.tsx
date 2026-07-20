import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Novexa News privacy policy and how we handle data, analytics, cookies and communications.",
  alternates: { canonical: absoluteUrl("/privacy-policy") }
};

export default function PrivacyPolicyPage() {
  return (
    <StaticPage title="Privacy Policy" description="This policy explains how Novexa News handles information related to visitors, analytics, newsletters and communications." updated="July 20, 2026">
      <h2>Information We Collect</h2>
      <p>We may collect basic usage data such as pages visited, device type, browser information, approximate location, referral sources and performance metrics. If you contact us or subscribe to updates, we may collect your email address and message details.</p>
      <h2>How We Use Information</h2>
      <p>We use information to operate the website, improve performance, understand readership trends, respond to inquiries, send requested communications and protect the platform from abuse.</p>
      <h2>Cookies And Analytics</h2>
      <p>Novexa News may use cookies or similar technologies for essential site functionality, analytics, advertising measurement and performance monitoring. You can manage cookies through your browser settings.</p>
      <h2>Advertising</h2>
      <p>Advertising partners may use cookies or similar technologies to measure ad performance and deliver relevant ads, subject to their own privacy policies and applicable law.</p>
      <h2>Data Sharing</h2>
      <p>We do not sell personal information. We may share limited data with service providers that help us run hosting, analytics, email delivery, security and advertising systems.</p>
      <h2>Contact</h2>
      <p>For privacy questions, email <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</p>
    </StaticPage>
  );
}
