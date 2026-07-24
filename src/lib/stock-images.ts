export type StockImageResult = {
  url: string;
  alt: string;
  credit: string;
  provider: "Pexels" | "Pixabay";
  pageUrl?: string;
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
  "hospital",
  "disease",
  "outbreak"
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
  Health: "healthcare doctor hospital corridor",
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

function isSensitiveStory(title: string, category: string) {
  const text = `${title} ${category}`.toLowerCase();
  return sensitiveTerms.some((term) => text.includes(term));
}

function stockQuery(title: string, category: string) {
  if (isSensitiveStory(title, category)) return "";
  return categoryQueries[category] || `${category} news`;
}

async function pexelsImage(query: string, title: string): Promise<StockImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "5");
    url.searchParams.set("size", "large");

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return null;

    const data = await response.json();
    const photo = Array.isArray(data.photos) ? data.photos[0] : null;
    const imageUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original;
    if (!imageUrl) return null;

    return {
      url: imageUrl,
      alt: photo.alt || title,
      credit: `Image credit: Photo by ${photo.photographer || "Pexels contributor"} on Pexels${photo.url ? ` - ${photo.url}` : ""}`,
      provider: "Pexels",
      pageUrl: photo.url
    };
  } catch {
    return null;
  }
}

async function pixabayImage(query: string, title: string): Promise<StockImageResult | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", "horizontal");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("editors_choice", "true");
    url.searchParams.set("per_page", "5");
    url.searchParams.set("min_width", "1200");
    url.searchParams.set("min_height", "630");

    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;

    const data = await response.json();
    const image = Array.isArray(data.hits) ? data.hits[0] : null;
    const imageUrl = image?.largeImageURL || image?.webformatURL;
    if (!imageUrl) return null;

    return {
      url: imageUrl,
      alt: image.tags || title,
      credit: `Image credit: Pixabay${image.pageURL ? ` - ${image.pageURL}` : ""}`,
      provider: "Pixabay",
      pageUrl: image.pageURL
    };
  } catch {
    return null;
  }
}

export async function findStockImage({ title, category }: { title: string; category: string }) {
  if (process.env.FEED_USE_STOCK_IMAGES === "false") return null;
  const query = stockQuery(title, category);
  if (!query) return null;

  return (await pexelsImage(query, title)) || (await pixabayImage(query, title));
}
