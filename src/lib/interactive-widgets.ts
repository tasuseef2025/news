export type WeatherWidget = {
  location: string;
  temperatureC?: number;
  windKph?: number;
  condition: string;
  updatedAt: string;
};

export type CurrencyRate = {
  pair: string;
  rate: number;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  currency?: string;
};

export type WidgetsResponse = {
  weather: WeatherWidget | null;
  currencies: CurrencyRate[];
  markets: MarketQuote[];
  errors: string[];
  updatedAt: string;
};

async function fetchJson(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

async function getWeather(locationName?: string): Promise<WeatherWidget | null> {
  const location = locationName?.trim() || process.env.WIDGET_WEATHER_LOCATION || "Karachi";
  const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
  const place = geo.results?.[0];
  if (!place) return null;

  const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`);
  const current = forecast.current || {};

  return {
    location: [place.name, place.country].filter(Boolean).join(", "),
    temperatureC: asNumber(current.temperature_2m),
    windKph: asNumber(current.wind_speed_10m),
    condition: weatherCodeText(asNumber(current.weather_code)),
    updatedAt: current.time || new Date().toISOString()
  };
}

function weatherCodeText(code?: number) {
  if (code === undefined) return "Current weather";
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Current weather";
}

async function getCurrencies(): Promise<CurrencyRate[]> {
  const base = process.env.WIDGET_CURRENCY_BASE || "USD";
  const symbols = (process.env.WIDGET_CURRENCY_SYMBOLS || "PKR,EUR,GBP,AED,SAR,INR").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
  const data = await fetchJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(symbols.join(","))}`);
  return Object.entries(data.rates || {}).map(([symbol, rate]) => ({ pair: `${base}/${symbol}`, rate: Number(rate) }));
}

async function getMarketQuote(symbol: string): Promise<MarketQuote | null> {
  const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta || asNumber(meta.regularMarketPrice) === undefined) return null;

  const price = asNumber(meta.regularMarketPrice);
  const previousClose = asNumber(meta.chartPreviousClose ?? meta.previousClose);
  const change = asNumber(meta.fulldayChange) ?? (price !== undefined && previousClose !== undefined ? price - previousClose : undefined);
  const changePercent = asNumber(meta.fulldayChangePercent ?? meta.regularMarketChangePercent);

  return {
    symbol: String(meta.symbol || symbol),
    name: String(meta.shortName || meta.longName || symbol),
    price,
    change,
    changePercent,
    currency: typeof meta.currency === "string" ? meta.currency : undefined
  };
}

async function getMarkets(): Promise<MarketQuote[]> {
  const symbols = (process.env.WIDGET_MARKET_SYMBOLS || "AAPL,MSFT,GOOGL,BTC-USD,ETH-USD").split(",").map((item) => item.trim()).filter(Boolean);
  if (!symbols.length) return [];

  const quotes = await Promise.all(
    symbols.map((symbol) => getMarketQuote(symbol).catch(() => null))
  );
  return quotes.filter((quote): quote is MarketQuote => Boolean(quote?.symbol));
}

export async function getWidgets(options: { location?: string } = {}): Promise<WidgetsResponse> {
  const errors: string[] = [];
  const [weather, currencies, markets] = await Promise.all([
    getWeather(options.location).catch((error) => {
      errors.push(`Weather: ${error instanceof Error ? error.message : "Unavailable"}`);
      return null;
    }),
    getCurrencies().catch((error) => {
      errors.push(`Currency: ${error instanceof Error ? error.message : "Unavailable"}`);
      return [];
    }),
    getMarkets().catch((error) => {
      errors.push(`Markets: ${error instanceof Error ? error.message : "Unavailable"}`);
      return [];
    })
  ]);

  return { weather, currencies, markets, errors, updatedAt: new Date().toISOString() };
}



