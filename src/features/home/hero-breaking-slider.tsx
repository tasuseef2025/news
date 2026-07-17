"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Article } from "@/types";

export function HeroBreakingSlider({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState(0);
  const article = articles[active];
  const hasMultiple = articles.length > 1;

  const controls = useMemo(
    () => ({
      previous: () => setActive((index) => (index === 0 ? articles.length - 1 : index - 1)),
      next: () => setActive((index) => (index === articles.length - 1 ? 0 : index + 1))
    }),
    [articles.length]
  );

  if (!article) {
    return (
      <section className="grid min-h-[420px] place-items-center rounded-lg border bg-card p-8 text-center">
        <div>
          <p className="text-sm font-black uppercase text-primary">Breaking News</p>
          <h1 className="mt-2 text-3xl font-black">No published breaking stories found</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Publish featured articles or articles in the Breaking News category from MongoDB to populate this hero.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-lg bg-black text-white md:min-h-[560px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={article.slug}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
          <Image src={article.image} alt={article.title} fill priority className="object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-5 md:min-h-[560px] md:p-8">
        <div className="max-w-3xl">
          <div className="mb-4 flex w-fit items-center gap-2 rounded-sm bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">
            Hero Breaking News
          </div>
          <Link href={`/news/${article.slug}`} className="text-4xl font-black leading-tight hover:text-primary md:text-6xl">
            {article.title}
          </Link>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">{article.excerpt}</p>
        </div>

        {hasMultiple ? (
          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {articles.map((item, index) => (
                <button
                  key={item.slug}
                  type="button"
                  aria-label={`Show slide ${index + 1}`}
                  onClick={() => setActive(index)}
                  className={`h-1.5 rounded-full transition-all ${active === index ? "w-10 bg-primary" : "w-5 bg-white/45"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="icon" aria-label="Previous breaking news" onClick={controls.previous}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Next breaking news" onClick={controls.next}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
