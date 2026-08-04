export type StockImageResult = {
  url: string;
  alt: string;
  credit: string;
  provider: "Pexels" | "Pixabay";
  pageUrl?: string;
};

type PexelsPhoto = {
  src?: { large2x?: string; large?: string; original?: string };
  alt?: string;
  photographer?: string;
  url?: string;
};

type PixabayHit = {
  largeImageURL?: string;
  webformatURL?: string;
  tags?: string;
  pageURL?: string;
};

const sensitiveTerms = [
  "war",
  "attack",
  "strike",
  "killed",
  "dead",
  "death",
  "murder",
  "crime",
  "rape",
  "abuse",
  "suicide",
  "shooting",
  "blast",
  "bomb",
  "explosion",
  "gaza",
  "israel",
  "palestine",
  "ukraine",
  "court",
  "lawsuit",
  "arrest",
  "disease",
  "outbreak"
];

const genericHeadlineWords = new Set([
  "pakistan",
  "update",
  "government",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "latest",
  "report",
  "reports",
  "price",
  "prices",
  "official",
  "officials",
  "announces",
  "announced",
  "country",
  "national"
]);

const topicQueries: Array<{ terms: RegExp; query: string }> = [
  { terms: /\b(petrol|diesel|fuel|petroleum|gasoline|oil price)\b/i, query: "petrol diesel fuel station" },
  { terms: /\b(cricket|test match|t20|odi|wicket|batsman|bowler)\b/i, query: "cricket match stadium" },
  { terms: /\b(football|soccer|premier league|champions league|fifa)\b/i, query: "football match stadium" },
  { terms: /\b(stock|shares|market|inflation|economy|interest rate)\b/i, query: "stock market finance" },
  { terms: /\b(ai|artificial intelligence|software|cyber|technology|smartphone)\b/i, query: "modern technology computing" },
  { terms: /\b(weather|rain|storm|flood|heatwave|snow)\b/i, query: "weather forecast climate" },
  { terms: /\b(health|medical|doctor|hospital|medicine)\b/i, query: "healthcare medical" },
  { terms: /\b(school|university|student|education|scholarship)\b/i, query: "students education classroom" },
  { terms: /\b(travel|tourism|flight|airport|hotel)\b/i, query: "travel airport tourism" }
];

const categoryQueries: Record<string, string> = {
  "Breaking News": "newsroom breaking news",
  Pakistan: "Pakistan city street",
  World: "global news world map",
  Politics: "government building politics",
  Business: "business finance office",
  Economy: "economy finance market",
  Technology: "technology data center",
  "Artificial Intelligence": "artificial intelligence technology",
  Startups: "startup office technology",
  "Cyber Security": "cyber security computer",
  Programming: "software developer code",
  Mobile: "smartphone technology",
  Gadgets: "modern gadgets technology",
  Science: "science laboratory research",
  Space: "space stars telescope",
  Environment: "environment nature climate",
  Climate: "climate change landscape",
  Health: "healthcare medical",
  Fitness: "fitness exercise gym",
  Education: "students classroom education",
  Jobs: "professional office workplace",
  Sports: "sports stadium",
  Cricket: "cricket stadium bat",
  Football: "football stadium soccer",
  Entertainment: "entertainment stage lights",
  Lifestyle: "modern lifestyle city",
  Fashion: "fashion studio",
  Food: "food table restaurant",
  Travel: "travel city destination",
  Finance: "finance stock market",
  Cryptocurrency: "cryptocurrency blockchain",
  Opinion: "newspaper editorial desk",
  Culture: "culture art museum",
  Weather: "weather clouds sky"
};

function imageHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string) {
  if (!items.length) return null;
  return items[imageHash(seed) % items.length];
}

function imageIdentity(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return value.toLowerCase().split("?")[0];
  }
}

function titleKeywords(title: string) {
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "for", "with", "from", "after", "before", "into", "onto", "over", "under", "this", "that", "these", "those", "says", "said", "will", "their", "about", "news"]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word) && !genericHeadlineWords.has(word))
    .slice(0, 5)
    .join(" ");
}

function isSensitiveStory(title: string, category: string) {
  const text = `${title} ${category}`.toLowerCase();
  return sensitiveTerms.some((term) => text.includes(term));
}

function stockQuery(title: string, category: string) {
  if (isSensitiveStory(title, category)) return "";
  const topic = topicQueries.find((item) => item.terms.test(title))?.query;
  if (topic) return `${topic}${/pakistan/i.test(title) || category === "Pakistan" ? " Pakistan" : ""}`;

  const keywords = titleKeywords(title);
  const categoryQuery = categoryQueries[category] || `${category} news`;
  return keywords ? `${keywords} ${categoryQuery}` : categoryQuery;
}

function pexelsUrl(photo: PexelsPhoto) {
  return photo.src?.large2x || photo.src?.large || photo.src?.original || "";
}

async function pexelsImage(query: string, title: string, excluded: Set<string>): Promise<StockImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "40");
    url.searchParams.set("size", "large");

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return null;

    const data = await response.json();
    const photos = Array.isArray(data.photos)
      ? (data.photos as PexelsPhoto[]).filter((photo) => pexelsUrl(photo) && !excluded.has(imageIdentity(pexelsUrl(photo))))
      : [];
    const photo = pickDeterministic(photos, title);
    const imageUrl = photo ? pexelsUrl(photo) : "";
    if (!photo || !imageUrl) return null;

    return {
      url: imageUrl,
      alt: photo.alt || title,
      credit: "Photo by " + (photo.photographer || "Pexels contributor") + " on Pexels",
      provider: "Pexels",
      pageUrl: photo.url
    };
  } catch {
    return null;
  }
}

function pixabayUrl(image: PixabayHit) {
  return image.largeImageURL || image.webformatURL || "";
}

async function pixabayImage(query: string, title: string, excluded: Set<string>): Promise<StockImageResult | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", "horizontal");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "40");
    url.searchParams.set("min_width", "1200");
    url.searchParams.set("min_height", "630");

    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;

    const data = await response.json();
    const images = Array.isArray(data.hits)
      ? (data.hits as PixabayHit[]).filter((image) => pixabayUrl(image) && !excluded.has(imageIdentity(pixabayUrl(image))))
      : [];
    const selected = pickDeterministic(images, title);
    const imageUrl = selected ? pixabayUrl(selected) : "";
    if (!selected || !imageUrl) return null;

    return {
      url: imageUrl,
      alt: selected.tags || title,
      credit: "Image from Pixabay",
      provider: "Pixabay",
      pageUrl: selected.pageURL
    };
  } catch {
    return null;
  }
}

export async function findStockImage({
  title,
  category,
  excludeUrls = []
}: {
  title: string;
  category: string;
  excludeUrls?: string[];
}) {
  if (process.env.FEED_USE_STOCK_IMAGES === "false") return null;
  const query = stockQuery(title, category);
  if (!query) return null;

  const excluded = new Set(excludeUrls.map(imageIdentity));
  return (await pexelsImage(query, title, excluded)) || (await pixabayImage(query, title, excluded));
}