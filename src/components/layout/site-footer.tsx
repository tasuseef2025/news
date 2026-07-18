import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { connectDB } from "@/lib/db";
import { categorySlug, primaryNavigationCategories } from "@/lib/categories";
import { Article } from "@/models/Article";
import { Tag } from "@/models/Tag";
import { FooterNewsletter } from "@/components/layout/footer-newsletter";
import { BackToTop } from "@/components/layout/back-to-top";

const companyLinks = [
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Privacy Policy", "/privacy-policy"],
  ["Terms", "/terms"],
  ["Editorial Policy", "/editorial-policy"],
  ["Cookie Policy", "/cookie-policy"],
  ["Advertise", "/advertise"],
  ["Careers", "/careers"]
] as const;

const socialLinks = [
  ["Facebook", "https://facebook.com", Facebook],
  ["Instagram", "https://instagram.com", Instagram],
  ["LinkedIn", "https://linkedin.com", Linkedin],
  ["YouTube", "https://youtube.com", Youtube],
  ["Twitter", "https://twitter.com", Twitter]
] as const;

type FooterArticle = {
  title: string;
  slug: string;
};

type FooterTag = {
  name: string;
  slug: string;
  count?: number;
};

async function getFooterData() {
  try {
    await connectDB();
    const [latestArticles, storedTags, articleTags] = await Promise.all([
      Article.find({ status: "published" }).select("title slug").sort({ publishedAt: -1 }).limit(5).lean(),
      Tag.find().select("name slug").sort({ name: 1 }).limit(12).lean(),
      Article.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 }
      ])
    ]);

    const popularTags: FooterTag[] = storedTags.length
      ? storedTags.map((tag) => ({ name: tag.name, slug: tag.slug }))
      : articleTags.map((tag) => ({ name: tag._id, slug: categorySlug(tag._id), count: tag.count }));

    return {
      latestArticles: latestArticles.map((article) => ({ title: article.title, slug: article.slug })) as FooterArticle[],
      popularTags
    };
  } catch {
    return { latestArticles: [] as FooterArticle[], popularTags: [] as FooterTag[] };
  }
}

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const { latestArticles, popularTags } = await getFooterData();

  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container grid gap-10 py-12 lg:grid-cols-[1.25fr_0.9fr_0.9fr_1fr]">
        <section className="grid content-start gap-5">
          <div>
            <Link href="/" className="text-3xl font-black uppercase tracking-normal">
              Novexa News
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Independent, fast, and SEO-ready digital journalism across breaking news, business, technology,
              politics, lifestyle, and culture.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-black uppercase text-foreground">Social Media</h2>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(([label, href, Icon]) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-md border bg-background transition hover:bg-muted hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-black uppercase text-foreground">Company</h2>
          <nav className="grid gap-2 text-sm font-semibold text-muted-foreground">
            {companyLinks.map(([label, href]) => (
              <Link key={label} href={href} className="hover:text-primary">
                {label}
              </Link>
            ))}
          </nav>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-black uppercase text-foreground">Categories</h2>
          <nav className="grid grid-cols-2 gap-2 text-sm font-semibold text-muted-foreground sm:grid-cols-3 lg:grid-cols-1">
            {primaryNavigationCategories.map((category) => (
              <Link key={category} href={`/category/${categorySlug(category)}`} className="hover:text-primary">
                {category}
              </Link>
            ))}
          </nav>
        </section>

        <section className="grid content-start gap-8">
          <div>
            <h2 className="mb-4 text-sm font-black uppercase text-foreground">Newsletter</h2>
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              Get the top headlines and editor picks delivered to your inbox.
            </p>
            <FooterNewsletter />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-black uppercase text-foreground">Latest Articles</h2>
            {latestArticles.length ? (
              <div className="grid gap-3 text-sm font-semibold text-muted-foreground">
                {latestArticles.map((article) => (
                  <Link key={article.slug} href={`/news/${article.slug}`} className="leading-5 hover:text-primary">
                    {article.title}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No published articles yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="border-t">
        <div className="container grid gap-6 py-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <section>
            <h2 className="mb-3 text-sm font-black uppercase text-foreground">Popular Tags</h2>
            {popularTags.length ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/api/search?q=${encodeURIComponent(tag.name)}`}
                    className="rounded-md border bg-background px-3 py-2 text-xs font-black text-muted-foreground transition hover:bg-muted hover:text-primary"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags available yet.</p>
            )}
          </section>
          <div className="flex flex-col gap-4 lg:items-end">
            <BackToTop />
            <p className="text-sm font-semibold text-muted-foreground">
              Copyright © {year} Novexa News. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

