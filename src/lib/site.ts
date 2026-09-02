export const siteConfig = {
  name: "Novexa News",
  shortName: "Novexa",
  tagline: "Daily Digital News",
  domain: "https://www.novexa.news",
  description: "Novexa News delivers fast, reliable coverage of breaking news, Pakistan, world affairs, business, technology, sports, health, entertainment and analysis.",
  locale: "en_US",
  language: "en",
  twitterHandle: "@NovexaNews",
  contactEmail: "newsnovexa@gmail.com",
  founder: "Abdul Basit",
  logoPath: "/logo.svg",
  iconPath: "/icon.svg"
} as const;

export type SocialPlatform = "instagram" | "x" | "facebook" | "linkedin" | "youtube";

/**
 * Only set a value here when a real, live profile exists. An empty string means
 * the platform is not published yet: nothing is rendered in the UI and nothing
 * is added to the `sameAs` array in structured data. Linking a bare platform
 * homepage is worse than linking nothing at all.
 */
export const socialUrls: Record<SocialPlatform, string> = {
  instagram: "https://www.instagram.com/novexa.news/",
  x: "https://x.com/NovexaNews",
  facebook: "",
  linkedin: "",
  youtube: ""
};

export const socialLabels: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube"
};

export type SocialProfile = {
  platform: SocialPlatform;
  url: string;
  label: string;
  ariaLabel: string;
};

export function activeSocialProfiles(): SocialProfile[] {
  return (Object.keys(socialUrls) as SocialPlatform[])
    .filter((platform) => socialUrls[platform].trim().length > 0)
    .map((platform) => ({
      platform,
      url: socialUrls[platform].trim(),
      label: socialLabels[platform],
      ariaLabel: `${siteConfig.name} on ${socialLabels[platform]}`
    }));
}

/** Real profile URLs only, for schema.org `sameAs`. */
export function socialSameAs() {
  return activeSocialProfiles().map((profile) => profile.url);
}

export function siteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || siteConfig.domain;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${path ? normalizedPath : ""}`;
}
