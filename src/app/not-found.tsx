import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="container grid min-h-[65vh] place-items-center py-16 text-center">
      <section className="max-w-xl">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Search className="h-7 w-7" />
        </div>
        <p className="text-sm font-black uppercase text-primary">404</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Page Not Found</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The page you are looking for may have moved, expired, or never existed. Browse the latest Novexa News coverage from the homepage.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-md bg-primary px-5 py-3 text-sm font-black text-primary-foreground hover:bg-primary/90">
            Go Home
          </Link>
          <Link href="/category/breaking-news" className="rounded-md border px-5 py-3 text-sm font-black hover:bg-muted">
            Breaking News
          </Link>
        </div>
      </section>
    </main>
  );
}
