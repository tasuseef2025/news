# Live Scores

Novexa News uses SportScore for real football and cricket live scores, upcoming fixtures, and recent results. No dummy scores are shown.

## SportScore

- No API key is required.
- The free tier allows about 10,000 requests per 24 hours per server IP.
- Responses are cached for 60 seconds.
- A visible dofollow `Powered by SportScore` link is required wherever the data is displayed.
- `SPORTSCORE_MATCH_LIMIT` controls results per sport and is clamped between 10 and 50.

```env
SPORTSCORE_MATCH_LIMIT=30
```

The application sends `src=novexa.news` to identify Novexa in SportScore's provider analytics.

## Optional Fallback Providers

```env
API_FOOTBALL_KEY=
API_CRICKET_KEY=
```

The existing API-FOOTBALL and API Cricket integrations remain server-side fallbacks if SportScore is unavailable.

## API Route

```http
GET /api/live-scores
GET /api/live-scores?sport=football
GET /api/live-scores?sport=cricket
```

Normalized matches include a `phase` of `live`, `upcoming`, `finished`, or `other`. The frontend provides All, Live, Upcoming, and Results tabs and refreshes once per minute.

## Match Details

Score cards open an internal SEO-friendly match page:

```http
GET /live-scores/{sport}/{match-slug}
GET /api/live-scores/{sport}/{match-slug}
```

Football pages can include the event timeline, cards, goals, substitutions, formations, starting elevens, substitutes, and statistics when SportScore supplies them. Cricket and less-covered matches gracefully show the available scoreboard and fixture information.
