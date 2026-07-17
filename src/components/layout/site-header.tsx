"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { canAccessAdmin } from "@/lib/permissions";
import { categories, categorySlug, primaryNavigationCategories } from "@/lib/categories";

const mainNav = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Media", href: "/media" },
  { label: "Privacy Policy", href: "/privacy-policy" }
];

const tickerLinks = primaryNavigationCategories.filter((category) => category !== "Breaking News");

export function SiteHeader() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const showAdmin = canAccessAdmin(session?.user.role);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container grid h-16 grid-cols-[44px_1fr_92px] items-center gap-2 md:h-20 md:grid-cols-[120px_1fr_120px]">
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMobileOpen((value) => !value)}
            className="h-10 w-10 rounded-full bg-muted/70 hover:bg-muted"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <Link href="/" className="mx-auto grid place-items-center text-center" aria-label="Newsroom home">
          <span className="text-[26px] font-black uppercase leading-none tracking-normal text-foreground md:text-[40px]">
            Newsroom
          </span>
          <span className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.38em] text-primary sm:block">
            Daily Digital News
          </span>
        </Link>

        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open search"
            onClick={() => setSearchOpen(true)}
            className="h-10 w-10 rounded-full hover:bg-muted"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav className="hidden border-t border-border/70 lg:block">
        <div className="container flex h-11 items-center justify-center gap-7 text-[13px] font-black uppercase text-foreground">
          {mainNav.slice(0, 3).map((item) => (
            <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
          ))}
          <div className="relative" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)}>
            <button
              type="button"
              className="flex h-11 items-center gap-1 transition hover:text-primary"
              onClick={() => setCategoriesOpen((value) => !value)}
              aria-expanded={categoriesOpen}
            >
              Categories
              <ChevronDown className={cn("h-4 w-4 transition", categoriesOpen && "rotate-180")} />
            </button>
            <AnimatePresence>{categoriesOpen ? <CategoriesDropdown /> : null}</AnimatePresence>
          </div>
          {mainNav.slice(3).map((item) => (
            <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
          ))}
          {showAdmin ? <NavLink href="/admin">Admin</NavLink> : null}
        </div>
      </nav>

      <div className="bg-black text-white">
        <div className="container flex h-11 items-center overflow-hidden px-0">
          <Link
            href="/category/breaking-news"
            className="z-10 flex h-11 shrink-0 items-center bg-primary px-4 text-xs font-black uppercase text-primary-foreground md:text-sm"
          >
            Breaking News
          </Link>
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-6 overflow-x-auto px-4 text-xs font-black uppercase md:text-sm">
            {tickerLinks.map((item) => (
              <Link key={item} href={`/category/${categorySlug(item)}`} className="shrink-0 transition hover:text-primary">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="max-h-[calc(100vh-120px)] overflow-y-auto border-t bg-card lg:hidden"
          >
            <div className="container grid gap-1 py-4 text-sm font-bold uppercase">
              {[...mainNav, ...primaryNavigationCategories.map((category) => ({ label: category, href: `/category/${categorySlug(category)}` }))].map((item) => (
                <Link key={item.label} href={item.href} className="rounded-md px-3 py-3 hover:bg-muted hover:text-primary" onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
              {showAdmin ? <Link href="/admin" className="rounded-md px-3 py-3 hover:bg-muted hover:text-primary" onClick={() => setMobileOpen(false)}>Admin</Link> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] grid place-items-start bg-black/70 px-4 pt-24 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mx-auto w-full max-w-2xl rounded-lg border bg-background p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-black uppercase text-muted-foreground">Search News</span>
                <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => setSearchOpen(false)}><X className="h-5 w-5" /></Button>
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-card px-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input autoFocus type="search" placeholder="Search breaking news, topics, categories..." className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none" />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="flex h-11 items-center transition hover:text-primary">{children}</Link>;
}

function CategoriesDropdown() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="absolute left-1/2 top-full z-50 max-h-[70vh] w-[min(920px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto rounded-lg border bg-card p-3 text-sm font-bold normal-case shadow-xl"
    >
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category} href={`/category/${categorySlug(category)}`} className="block rounded-md px-3 py-2 transition hover:bg-muted hover:text-primary">
            {category}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
