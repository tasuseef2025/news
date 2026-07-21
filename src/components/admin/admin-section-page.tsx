import Link from "next/link";
import type { ReactNode } from "react";

type Stat = { label: string; value: string | number };
type Row = Record<string, ReactNode>;

export function AdminSectionPage({
  title,
  eyebrow = "Admin",
  description,
  stats = [],
  actions = [],
  columns = [],
  rows = [],
  empty = "No records found."
}: {
  title: string;
  eyebrow?: string;
  description: string;
  stats?: Stat[];
  actions?: Array<{ label: string; href: string }>;
  columns?: string[];
  rows?: Row[];
  empty?: string;
}) {
  return (
    <main className="min-h-screen bg-muted/35 p-4 md:p-6 xl:p-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-primary">{eyebrow}</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {actions.length ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Link key={action.href} href={action.href} className="rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90">
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {stats.length ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-muted-foreground">{stat.label}</p>
                <p className="mt-3 text-3xl font-black">{stat.value}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          {columns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>{columns.map((column) => <th key={column} className="py-3 pr-4">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      {columns.map((column) => <td key={column} className="py-3 pr-4 align-top">{row[column] ?? "-"}</td>)}
                    </tr>
                  )) : (
                    <tr><td colSpan={columns.length} className="py-8 text-center text-muted-foreground">{empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{empty}</p>
          )}
        </section>
      </div>
    </main>
  );
}
