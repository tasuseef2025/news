export const siteConfig = {
  name: "Novexa News",
  shortName: "Novexa",
  tagline: "Daily Digital News",
  domain: "https://www.novexa.news",
  description: "Novexa News delivers fast, reliable coverage of breaking news, Pakistan, world affairs, business, technology, sports, health, entertainment and analysis.",
  locale: "en_US",
  language: "en",
  twitterHandle: "@NovexaNews",
  logoPath: "/logo.svg",
  iconPath: "/icon.svg"
} as const;

export function siteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || siteConfig.domain;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${path ? normalizedPath : ""}`;
}
