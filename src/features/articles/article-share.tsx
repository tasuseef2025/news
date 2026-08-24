"use client";

import { Check, Copy, Facebook, Instagram, Linkedin, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareProps = {
  title: string;
  url: string;
};

const platforms = [
  {
    name: "Facebook",
    icon: Facebook,
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  },
  {
    name: "X",
    icon: Share2,
    href: (url: string, title: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    href: (url: string, title: string) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
  }
];

export function ArticleShare({ title, url }: ShareProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (!navigator.share) return copyLink();
    await navigator.share({ title, url });
  }

  async function shareToInstagram() {
    const text = `${title}\n${url}`;
    await navigator.clipboard.writeText(text);

    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }

    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article">
      <Button type="button" size="sm" onClick={nativeShare} className="gap-2">
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      {platforms.map((platform) => {
        const Icon = platform.icon;
        return (
          <Button key={platform.name} asChild size="icon" variant="outline" title={`Share on ${platform.name}`}>
            <a href={platform.href(url, title)} target="_blank" rel="noreferrer" aria-label={`Share on ${platform.name}`}>
              <Icon className="h-4 w-4" />
            </a>
          </Button>
        );
      })}
      <Button type="button" size="icon" variant="outline" onClick={shareToInstagram} title="Share article link to Instagram" aria-label="Share article link to Instagram">
        <Instagram className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="outline" onClick={copyLink} title="Copy article link" aria-label="Copy article link">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
