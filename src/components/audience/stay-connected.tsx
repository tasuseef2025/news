import Link from "next/link";
import { ExternalLink, Newspaper, Rss } from "lucide-react";
import { FooterNewsletter } from "@/components/layout/footer-newsletter";

const googleNewsSearch =
  "https://news.google.com/search?q=site%3Anovexa.news&hl=en-PK&gl=PK&ceid=PK%3Aen";

export function StayConnected() {
  return (
    <section className="border-y bg-card" aria-labelledby="stay-connected-title">
      <div className="grid gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1fr_380px] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase text-primary">Stay informed</p>
          <h2 id="stay-connected-title" className="font-editorial mt-2 text-3xl font-bold">
            Follow Novexa News
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose Novexa as a preferred source, find our reporting in Google News, or follow every published
            story through RSS.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-12 items-center justify-center rounded-md border bg-background px-3">
              <div google-add-preferred-source-btn="" data-theme="light" data-lang="en" />
            </div>
            <Link
              href={googleNewsSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              <Newspaper className="h-4 w-4" />
              Find us on Google News
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-bold transition hover:border-primary hover:text-primary sm:col-span-2"
            >
              <Rss className="h-4 w-4" />
              Follow the Novexa RSS feed
            </Link>
          </div>
        </div>

        <div className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h3 className="font-editorial text-xl font-bold">Get the morning edition</h3>
          <p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">
            Editor-selected headlines and important updates, delivered by email.
          </p>
          <FooterNewsletter source="stay-connected" />
        </div>
      </div>
    </section>
  );
}
