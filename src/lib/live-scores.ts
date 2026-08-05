export type LiveScoreSport = "football" | "cricket";
export type MatchPhase = "live" | "upcoming" | "finished" | "other";

export type LiveScoreMatch = {
  id: string;
  sport: LiveScoreSport;
  league?: string;
  country?: string;
  status: string;
  statusShort?: string;
  phase: MatchPhase;
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
  matchUrl?: string;
  provider: string;
};

export type LiveScoresResponse = {
  football: LiveScoreMatch[];
  cricket: LiveScoreMatch[];
  configured: { football: boolean; cricket: boolean };
  provider: { name: string; url: string };
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

async function fetchJson(url: string, init?: RequestInit, revalidate = 60) {
  const response = await fetch(url, {
    ...init,
    next: { revalidate },
    headers: { Accept: "application/json", ...(init?.headers || {}) }
  });

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

function matchPhase(status: string): MatchPhase {
  const value = status.toLowerCase();
  if (/live|in progress|playing|half|quarter|innings|break/.test(value)) return "live";
  if (/upcoming|scheduled|not started|postponed/.test(value)) return "upcoming";
  if (/finished|final|completed|ended|after extra time|penalties/.test(value)) return "finished";
  return "other";
}

function sportScoreStatus(status: string, statusText: string) {
  const phase = matchPhase(status);
  if (phase === "upcoming") return /postponed/i.test(statusText) ? "Postponed" : "Upcoming";
  if (phase === "finished") return "Finished";
  return statusText || (phase === "live" ? "Live" : status || "Unknown");
}

function normalizeSportScore(data: unknown, sport: LiveScoreSport): LiveScoreMatch[] {
  const payload = data as { matches?: Array<Record<string, unknown>> };
  return (payload.matches || []).map((item, index) => {
    const rawStatus = asText(item.status, "unknown");
    const status = sportScoreStatus(rawStatus, asText(item.status_text));
    const path = asText(item.url);
    const startsAt = asText(item.time) || undefined;

    return {
      id: path || `${sport}-${startsAt || "unknown"}-${index}`,
      sport,
      league: asText(item.competition) || undefined,
      status,
      statusShort: status,
      phase: matchPhase(rawStatus),
      startsAt,
      homeTeam: asText(item.home, "Home"),
      awayTeam: asText(item.away, "Away"),
      homeLogo: asText(item.home_logo) || undefined,
      awayLogo: asText(item.away_logo) || undefined,
      homeScore: item.home_score === null ? undefined : asText(item.home_score) || undefined,
      awayScore: item.away_score === null ? undefined : asText(item.away_score) || undefined,
      matchUrl: path ? new URL(path, "https://sportscore.com").toString() : undefined,
      provider: "SportScore"
    };
  });
}

function normalizeFootball(data: unknown): LiveScoreMatch[] {
  const payload = data as { response?: Array<Record<string, unknown>> };
  return (payload.response || []).map((item) => {
    const fixture = (item.fixture || {}) as Record<string, unknown>;
    const status = (fixture.status || {}) as Record<string, unknown>;
    const league = (item.league || {}) as Record<string, unknown>;
    const teams = (item.teams || {}) as Record<string, Record<string, unknown>>;
    const goals = (item.goals || {}) as Record<string, unknown>;
    const statusLong = asText(status.long, "Live");

    return {
      id: asText(fixture.id),
      sport: "football",
      league: asText(league.name),
      country: asText(league.country),
      status: statusLong,
      statusShort: asText(status.short),
      phase: matchPhase(`${statusLong} ${asText(status.short)}`),
      minute: asNumber(status.elapsed),
      startsAt: asText(fixture.date) || undefined,
      homeTeam: asText(teams.home?.name, "Home"),
      awayTeam: asText(teams.away?.name, "Away"),
      homeLogo: asText(teams.home?.logo) || undefined,
      awayLogo: asText(teams.away?.logo) || undefined,
      homeScore: goals.home === null ? undefined : asNumber(goals.home),
      awayScore: goals.away === null ? undefined : asNumber(goals.away),
      venue: asText(((fixture.venue || {}) as Record<string, unknown>).name) || undefined,
      provider: "API-FOOTBALL"
    };
  });
}

function normalizeCricket(data: unknown): LiveScoreMatch[] {
  const payload = data as { result?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
  return (payload.result || payload.data || []).map((item) => {
    const status = asText(item.event_status || item.status || item.match_status, "Live");
    return {
      id: asText(item.event_key || item.id || item.fixture_id),
      sport: "cricket",
      league: asText(item.league_name || item.event_league || item.series || item.competition_name),
      country: asText(item.country_name || item.country),
      status,
      statusShort: asText(item.event_live || item.status_short),
      phase: matchPhase(status),
      startsAt: asText(item.event_date_start || item.date_start || item.starting_at) || undefined,
      homeTeam: asText(item.event_home_team || item.localteam_name || item.home_team || item.team_a, "Team A"),
      awayTeam: asText(item.event_away_team || item.visitorteam_name || item.away_team || item.team_b, "Team B"),
      homeLogo: asText(item.home_team_logo || item.localteam_image) || undefined,
      awayLogo: asText(item.away_team_logo || item.visitorteam_image) || undefined,
      homeScore: asText(item.event_home_final_result || item.event_home_rr || item.home_score || item.localteam_score || item.score) || undefined,
      awayScore: asText(item.event_away_final_result || item.event_away_rr || item.away_score || item.visitorteam_score) || undefined,
      venue: asText(item.event_stadium || item.venue_name || item.venue) || undefined,
      note: asText(item.event_status_info || item.note || item.result) || undefined,
      provider: "API Cricket"
    };
  });
}

async function sportScoreMatches(sport: LiveScoreSport) {
  const limit = Math.min(50, Math.max(10, Number(process.env.SPORTSCORE_MATCH_LIMIT) || 30));
  const url = new URL("https://sportscore.com/api/widget/matches/");
  url.searchParams.set("sport", sport);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("src", "novexa.news");
  return fetchJson(url.toString()).then((data) => normalizeSportScore(data, sport));
}

export async function getLiveScores(): Promise<LiveScoresResponse> {
  const errors: string[] = [];
  const footballKey = process.env.API_FOOTBALL_KEY;
  const cricketKey = process.env.API_CRICKET_KEY;

  const load = async (sport: LiveScoreSport) => {
    try {
      return await sportScoreMatches(sport);
    } catch (error) {
      errors.push(`${sport === "football" ? "Football" : "Cricket"}: SportScore ${error instanceof Error ? error.message : "request failed"}`);
    }

    if (sport === "football" && footballKey) {
      return fetchJson("https://v3.football.api-sports.io/fixtures?live=all", { headers: { "x-apisports-key": footballKey } }, 15).then(normalizeFootball);
    }
    if (sport === "cricket" && cricketKey) {
      return fetchJson(`https://apiv2.api-cricket.com/cricket/?method=get_livescore&APIkey=${encodeURIComponent(cricketKey)}`, undefined, 15).then(normalizeCricket);
    }
    return [];
  };

  const [football, cricket] = await Promise.all([load("football"), load("cricket")]);
  return {
    football,
    cricket,
    configured: { football: true, cricket: true },
    provider: { name: "SportScore", url: "https://sportscore.com/" },
    errors,
    updatedAt: new Date().toISOString()
  };
}
