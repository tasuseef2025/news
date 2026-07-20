import type { Metadata } from "next";
import { StaticPage } from "@/components/static/static-page";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Advertise",
  description: "Advertise with Novexa News across news, technology, business, finance, sports and lifestyle audiences.",
  alternates: { canonical: absoluteUrl("/advertise") }
};

export default function AdvertisePage() {
  return (
    <StaticPage title="Advertise With Novexa News" description="Reach readers across breaking news, technology, business, finance, sports, entertainment, health and lifestyle coverage.">
      <h2>Advertising Opportunities</h2>
      <p>Novexa News supports display advertising, sponsored placements, newsletter sponsorships, affiliate campaigns and custom brand partnerships.</p>
      <h2>Audience</h2>
      <p>Our coverage is built for readers interested in fast-moving news, technology, finance, cryptocurrency, world affairs, sports, entertainment and practical lifestyle updates.</p>
      <h2>Contact For Ads</h2>
      <p>For rates, availability and campaign proposals, email <a href={`mailto:${siteConfig.contactEmail}?subject=Advertising%20Inquiry%20-%20Novexa%20News`}>{siteConfig.contactEmail}</a>.</p>
    </StaticPage>
  );
}
