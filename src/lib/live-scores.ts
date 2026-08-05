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
  slug?: string;
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

export type MatchIncident = {
  time?: number | string;
  type: string;
  side?: "home" | "away";
  player?: string;
  playerIn?: string;
  playerOut?: string;
  homeScore?: number | string;
  awayScore?: number | string;
};

export type MatchPlayer = {
  name: string;
  number?: number | string;
  position?: string;
  captain?: boolean;
  rating?: string;
};

export type MatchLineups = {
  homeFormation?: string;
  awayFormation?: string;
  homeCoach?: string;
  awayCoach?: string;
  confirmed: boolean;
  homeXi: MatchPlayer[];
  awayXi: MatchPlayer[];
  homeSubs: MatchPlayer[];
  awaySubs: MatchPlayer[];
};

export type MatchStat = {
  label: string;
  home?: number | string;
  away?: number | string;
};

export type MatchDetail = LiveScoreMatch & {
  competitionLogo?: string;
  incidents: MatchIncident[];
  stats: MatchStat[];
  lineups?: MatchLineups;
  homeHalfTimeScore?: number | string;
  awayHalfTimeScore?: number | string;
  trackerId?: string;
};

export type MatchDetailResponse = {
  match: MatchDetail;
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
      slug: sportScoreSlug(path),
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


function sportScoreSlug(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) || "";
}

function normalizePlayers(value: unknown): MatchPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.map((player) => {
    const item = player as Record<string, unknown>;
    return {
      name: asText(item.name, "Unknown player"),
      number: item.number === null || item.number === undefined ? undefined : asText(item.number),
      position: asText(item.position) || undefined,
      captain: Boolean(item.captain),
      rating: asText(item.rating) || undefined
    };
  });
}

function normalizeLineups(value: unknown): MatchLineups | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const lineups = {
    homeFormation: asText(item.home_formation) || undefined,
    awayFormation: asText(item.away_formation) || undefined,
    homeCoach: asText(item.home_coach) || undefined,
    awayCoach: asText(item.away_coach) || undefined,
    confirmed: Boolean(item.confirmed),
    homeXi: normalizePlayers(item.home_xi),
    awayXi: normalizePlayers(item.away_xi),
    homeSubs: normalizePlayers(item.home_subs),
    awaySubs: normalizePlayers(item.away_subs)
  };
  return lineups.homeXi.length || lineups.awayXi.length || lineups.homeSubs.length || lineups.awaySubs.length ? lineups : undefined;
}

function normalizeIncidents(value: unknown): MatchIncident[] {
  if (!Array.isArray(value)) return [];
  return value.map((incident) => {
    const item = incident as Record<string, unknown>;
    return {
      time: item.time === null || item.time === undefined ? undefined : asText(item.time),
      type: asText(item.type, "Match event"),
      side: item.side === "home" || item.side === "away" ? item.side : undefined,
      player: asText(item.player) || undefined,
      playerIn: asText(item.player_in) || undefined,
      playerOut: asText(item.player_out) || undefined,
      homeScore: item.home_score === null || item.home_score === undefined ? undefined : asText(item.home_score),
      awayScore: item.away_score === null || item.away_score === undefined ? undefined : asText(item.away_score)
    };
  });
}

function normalizeStats(value: unknown): MatchStat[] {
  if (!Array.isArray(value)) return [];
  return value.map((stat) => {
    const item = stat as Record<string, unknown>;
    return {
      label: asText(item.type || item.name || item.label || item.key, "Statistic"),
      home: item.home === null || item.home === undefined ? asText(item.home_value || item.home_score) || undefined : asText(item.home),
      away: item.away === null || item.away === undefined ? asText(item.away_value || item.away_score) || undefined : asText(item.away)
    };
  });
}

export async function getMatchDetail(sport: LiveScoreSport, slug: string): Promise<MatchDetailResponse> {
  if (!["football", "cricket"].includes(sport) || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid match");
  const url = new URL("https://sportscore.com/api/widget/match/");
  url.searchParams.set("sport", sport);
  url.searchParams.set("slug", slug);
  url.searchParams.set("src", "novexa.news");

  const payload = await fetchJson(url.toString()) as { match?: Record<string, unknown>; updated?: string };
  if (!payload.match) throw new Error("Match not found");
  const item = payload.match;
  const summary = normalizeSportScore({ matches: [item] }, sport)[0];
  const tracker = (item.tracker || {}) as Record<string, unknown>;

  return {
    match: {
      ...summary,
      slug,
      minute: asNumber(item.live_minute),
      competitionLogo: asText(item.competition_logo) || undefined,
      incidents: normalizeIncidents(item.incidents),
      stats: normalizeStats(item.stats),
      lineups: normalizeLineups(item.lineups),
      homeHalfTimeScore: item.home_ht_score === null || item.home_ht_score === undefined ? undefined : asText(item.home_ht_score),
      awayHalfTimeScore: item.away_ht_score === null || item.away_ht_score === undefined ? undefined : asText(item.away_ht_score),
      trackerId: asText(tracker.id) || undefined
    },
    updatedAt: asText(payload.updated, new Date().toISOString())
  };
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
