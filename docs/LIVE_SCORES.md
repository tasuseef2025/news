# Live Scores

Novexa News supports real football and cricket live scores through provider-backed APIs. No dummy scores are shown.

## Environment Variables

```env
API_FOOTBALL_KEY=
API_CRICKET_KEY=
```

- `API_FOOTBALL_KEY` is used with API-SPORTS API-Football.
- `API_CRICKET_KEY` is used with API Cricket's live score endpoint.

Keep these keys server-side only. Do not expose them in client components.

## API Route

```http
GET /api/live-scores
GET /api/live-scores?sport=football
GET /api/live-scores?sport=cricket
```

The response contains normalized match objects for the frontend live score panel.

## Frontend

- Homepage sports section includes a compact live score widget.
- Full page: `/live-scores`.
- The widget auto-refreshes every 30 seconds.

## Provider Setup

1. Create a football key from API-SPORTS API-Football.
2. Create a cricket key from API Cricket.
3. Add both keys in Vercel Environment Variables.
4. Redeploy.

If a key is missing, the UI shows a configuration message instead of fake scores.
