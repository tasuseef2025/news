import type { Metadata } from "next";
import { InteractiveWidgetsPanel } from "@/features/widgets/interactive-widgets-panel";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live Widgets: Weather, Markets, Currency and Scores",
  description: "Track live cricket and football scores, weather, currency exchange rates, stocks and crypto market updates on Novexa News.",
  alternates: { canonical: absoluteUrl("/interactive-widgets") },
  openGraph: {
    title: `Live Widgets | ${siteConfig.name}`,
    description: "Live weather, currency, markets, cricket and football widgets on Novexa News.",
    url: absoluteUrl("/interactive-widgets"),
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl("/api/og?title=Live%20Widgets&category=Tools"), width: 1200, height: 630, alt: "Live widgets on Novexa News" }]
  }
};

type Props = {
  searchParams: Promise<{ location?: string }>;
};

export default async function InteractiveWidgetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const location = params.location || "";

  return (
    <main className="container py-8">
      <div className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Live Tools</p>
        <h1 className="text-4xl font-black">Interactive Widgets</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Fast live tools for readers who want scores, markets, weather and exchange rates in one place.
        </p>
      </div>
      <InteractiveWidgetsPanel initialLocation={location} />
    </main>
  );
}
