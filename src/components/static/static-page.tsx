import Link from "next/link";
import { siteConfig } from "@/lib/site";

type StaticPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  updated?: string;
  children: React.ReactNode;
};

export function StaticPage({ eyebrow = siteConfig.name, title, description, updated, children }: StaticPageProps) {
  return (
    <main className="container max-w-4xl py-10">
      <header className="mb-8 border-b pb-6">
        <p className="text-sm font-black uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
        {updated ? <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">Last updated: {updated}</p> : null}
      </header>
      <article className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-black prose-a:font-bold prose-a:text-primary">
        {children}
      </article>
      <footer className="mt-10 rounded-lg border bg-card p-5 text-sm leading-6 text-muted-foreground">
        Questions? Contact <a className="font-bold text-primary" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
      </footer>
    </main>
  );
}

export function ContactLink({ label = siteConfig.contactEmail }: { label?: string }) {
  return <a href={`mailto:${siteConfig.contactEmail}`}>{label}</a>;
}

export function HomeLink() {
  return <Link href="/">return to the homepage</Link>;
}
