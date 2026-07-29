import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SubmitTipForm } from "@/features/tips/submit-tip-form";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Submit a News Tip",
  description: "Send a confidential news tip, photo or video to the Novexa News editorial desk for review.",
  alternates: { canonical: absoluteUrl("/submit-tip") },
  openGraph: {
    title: `Submit a News Tip | ${siteConfig.name}`,
    description: "Share verified leads, photos and videos with the Novexa News editorial desk.",
    url: absoluteUrl("/submit-tip"),
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl("/api/og?title=Submit%20a%20Tip&category=Newsroom"), width: 1200, height: 630, alt: "Submit a news tip to Novexa News" }]
  }
};

export default function SubmitTipPage() {
  return (
    <main className="container max-w-4xl py-8">
      <div className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Newsroom</p>
        <h1 className="text-4xl font-black">Submit a News Tip</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Share a lead, photo or video with the Novexa News editorial desk. Anonymous submissions are supported, but contact details can help us verify important stories faster.
        </p>
      </div>
      <div className="mb-6 flex gap-3 rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>Only submit material you have the right to share. Our editors review tips before publication and may contact you for verification when details are provided.</p>
      </div>
      <SubmitTipForm />
    </main>
  );
}

