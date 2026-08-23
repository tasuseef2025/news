import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { WebVitals } from "@/components/analytics/web-vitals";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { GoogleAdsense } from "@/components/ads/google-adsense";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap"
});

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  url: absoluteUrl("/"),
  logo: absoluteUrl(siteConfig.logoPath),
  description: siteConfig.description,
  founder: { "@type": "Person", name: siteConfig.founder, url: absoluteUrl("/author/abdul-basit") },
  contactPoint: [{ "@type": "ContactPoint", email: siteConfig.contactEmail, contactType: "editorial and advertising" }],
  publishingPrinciples: absoluteUrl("/editorial-policy"),
  ethicsPolicy: absoluteUrl("/editorial-policy"),
  correctionsPolicy: absoluteUrl("/contact"),
  ownershipFundingInfo: absoluteUrl("/about"),
  areaServed: ["Pakistan", "Global"],
  knowsAbout: ["Pakistan news", "world news", "business", "technology", "finance", "sports", "health", "entertainment", "lifestyle", "education"],
  sameAs: []
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: absoluteUrl("/"),
  potentialAction: {
    "@type": "SearchAction",
    target: `${absoluteUrl("/search")}?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  applicationName: siteConfig.name,
  manifest: "/site.webmanifest",
  title: {
    default: `${siteConfig.name} - Breaking News, Pakistan, World, Business and Technology`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: [
    "Novexa News",
    "breaking news",
    "Pakistan news",
    "world news",
    "business news",
    "technology news",
    "sports news",
    "latest news"
  ],
  authors: [{ name: siteConfig.name, url: absoluteUrl("/") }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "news",
  icons: {
    icon: siteConfig.iconPath,
    shortcut: siteConfig.iconPath,
    apple: siteConfig.iconPath
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  alternates: {
    canonical: absoluteUrl("/"),
    types: {
      "application/rss+xml": absoluteUrl("/rss.xml")
    }
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [{ url: absoluteUrl("/api/og"), width: 1200, height: 630, alt: siteConfig.name }]
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [absoluteUrl("/api/og")]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleAdsense />
        <script async src="https://news.google.com/swg/js/v1/publisher.js" />
      </head>
      <body className={inter.variable}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <AppProviders>
          <GoogleAnalytics />
          <WebVitals />
          <SiteHeader />
          {children}
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}



