import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Read how Novexa News may use cookies and similar technologies.",
  alternates: { canonical: absoluteUrl("/cookie-policy") }
};

export default function CookiePolicyPage() {
  return (
    <StaticPage title="Cookie Policy" description="This policy explains how cookies and similar technologies may be used on Novexa News." updated="July 20, 2026">
      <h2>What Cookies Are</h2>
      <p>Cookies are small files stored by your browser to support website functionality, analytics, preferences, security and advertising measurement.</p>
      <h2>How We May Use Cookies</h2>
      <p>Novexa News may use cookies to keep the site working, measure audience behavior, improve performance, remember preferences and support advertising or affiliate measurement.</p>
      <h2>Third-Party Cookies</h2>
      <p>Analytics, advertising, embedded media or social platforms may set their own cookies according to their own policies.</p>
      <h2>Managing Cookies</h2>
      <p>You can block or delete cookies through your browser settings. Some features may not work correctly if essential cookies are disabled.</p>
      <h2>Contact</h2>
      <p>Cookie questions can be sent to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</p>
    </StaticPage>
  );
}
