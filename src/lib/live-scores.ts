export type LiveScoreSport = "football" | "cricket";

export type LiveScoreMatch = {
  id: string;
  sport: LiveScoreSport;
  league?: string;
  country?: string;
  status: string;
  statusShort?: string;
  minute?: number;
  startsAt?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number | string;
  awayScore?: number | string;
  venue?: string;
  note?: string;
  provider: string;
};

export type LiveScoresResponse = {
  football: LiveScoreMatch[];
  cricket: LiveScoreMatch[];
  configured: {
    football: boolean;
    cricket: boolean;
  };
  errors: string[];
  updatedAt: string;
};

function asText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    next: { revalidate: 15 },
    headers: {
      Accept: "application/json",
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function normalizeFootball(data: unknown): LiveScoreMatch[] {
  const payload = data as { response?: Array<Record<string, unknown>> };
  return (payload.response || []).map((item) => {
    const fixture = (item.fixture || {}) as Record<string, unknown>;
    const status = (fixture.status || {}) as Record<string, unknown>;
    const league = (item.league || {}) as Record<string, unknown>;
    const teams = (item.teams || {}) as Record<string, Record<string, unknown>>;
    const goals = (item.goals || {}) as Record<string, unknown>;
    const home = teams.home || {};
    const away = teams.away || {};

    return {
      id: asText(fixture.id),
      sport: "football",
      league: asText(league.name),
      country: asText(league.country),
      status: asText(status.long, "Live"),
      statusShort: asText(status.short),
      minute: asNumber(status.elapsed),
      startsAt: asText(fixture.date) || undefined,
      homeTeam: asText(home.name, "Home"),
      awayTeam: asText(away.name, "Away"),
      homeLogo: asText(home.logo) || undefined,
      awayLogo: asText(away.logo) || undefined,
      homeScore: goals.home === null ? undefined : asNumber(goals.home),
      awayScore: goals.away === null ? undefined : asNumber(goals.away),
      venue: asText(((fixture.venue || {}) as Record<string, unknown>).name) || undefined,
      provider: "API-FOOTBALL"
    };
  });
}

function normalizeCricket(data: unknown): LiveScoreMatch[] {
  const payload = data as { result?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
  const rows = payload.result || payload.data || [];

  return rows.map((item) => {
    const homeScore = item.event_home_final_result || item.event_home_rr || item.home_score || item.localteam_score || item.score;
    const awayScore = item.event_away_final_result || item.event_away_rr || item.away_score || item.visitorteam_score;

    return {
      id: asText(item.event_key || item.id || item.fixture_id),
      sport: "cricket",
      league: asText(item.league_name || item.event_league || item.series || item.competition_name),
      country: asText(item.country_name || item.country),
      status: asText(item.event_status || item.status || item.match_status, "Live"),
      statusShort: asText(item.event_live || item.status_short),
      startsAt: asText(item.event_date_start || item.date_start || item.starting_at) || undefined,
      homeTeam: asText(item.event_home_team || item.localteam_name || item.home_team || item.team_a, "Team A"),
      awayTeam: asText(item.event_away_team || item.visitorteam_name || item.away_team || item.team_b, "Team B"),
      homeLogo: asText(item.home_team_logo || item.localteam_image) || undefined,
      awayLogo: asText(item.away_team_logo || item.visitorteam_image) || undefined,
      homeScore: asText(homeScore) || undefined,
      awayScore: asText(awayScore) || undefined,
      venue: asText(item.event_stadium || item.venue_name || item.venue) || undefined,
      note: asText(item.event_status_info || item.note || item.result) || undefined,
      provider: "API Cricket"
    };
  });
}

export async function getLiveScores(): Promise<LiveScoresResponse> {
  const errors: string[] = [];
  const footballKey = process.env.API_FOOTBALL_KEY;
  const cricketKey = process.env.API_CRICKET_KEY;

  const [football, cricket] = await Promise.all([
    footballKey
      ? fetchJson("https://v3.football.api-sports.io/fixtures?live=all", {
          headers: { "x-apisports-key": footballKey }
        })
          .then(normalizeFootball)
          .catch((error) => {
            errors.push(`Football: ${error instanceof Error ? error.message : "Unable to load live scores"}`);
            return [];
          })
      : Promise.resolve([]),
    cricketKey
      ? fetchJson(`https://apiv2.api-cricket.com/cricket/?method=get_livescore&APIkey=${encodeURIComponent(cricketKey)}`)
          .then(normalizeCricket)
          .catch((error) => {
            errors.push(`Cricket: ${error instanceof Error ? error.message : "Unable to load live scores"}`);
            return [];
          })
      : Promise.resolve([])
  ]);

  return {
    football,
    cricket,
    configured: {
      football: Boolean(footballKey),
      cricket: Boolean(cricketKey)
    },
    errors,
    updatedAt: new Date().toISOString()
  };
}
