const authorProfiles: Record<string, string> = {
  "abdul basit": "/author/abdul-basit",
  "ms syeda manal tirmizi": "/author/syeda-manal-tirmizi",
  "ms. syeda manal tirmizi": "/author/syeda-manal-tirmizi",
  "syeda manal tirmizi": "/author/syeda-manal-tirmizi"
};

export function authorProfilePath(name?: string | null) {
  const normalized = name?.trim().toLowerCase().replace(/\s+/g, " ") || "";
  return authorProfiles[normalized] || "/about";
}
