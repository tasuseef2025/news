import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { absoluteUrl } from "@/lib/utils";
import { WebVitals } from "@/components/analytics/web-vitals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: "Newsroom - Latest News, Analysis and Live Updates",
    template: "%s | Newsroom"
  },
  description: "A modern, fast and SEO-friendly news portal for breaking news, business, technology, sport and analysis.",
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
    title: "Newsroom",
    description: "Latest news, analysis and live updates.",
    type: "website",
    url: absoluteUrl()
  },
  twitter: {
    card: "summary_large_image",
    title: "Newsroom",
    description: "Latest news, analysis and live updates."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <AppProviders>
          <WebVitals />
          <SiteHeader />
          {children}
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}


