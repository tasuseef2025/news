# Indexed URL Recovery

This command only rewrites drafts present in the supplied Search Console indexed-URL JSON export and currently returning HTTP 404. It never processes the general backlog or changes normal feed generation. The export is historical evidence, not a live Google indexing check.

```powershell
# Live 404 and source checks only, without model calls or database writes.
node node_modules/tsx/dist/cli.mjs server/scripts/recover-indexed-articles.ts --plan --limit=5

# Generate and validate a small preview without database writes.
node node_modules/tsx/dist/cli.mjs server/scripts/recover-indexed-articles.ts --limit=5 --print

# Restore selected indexed 404s. Use --limit=0 to process every eligible draft.
node node_modules/tsx/dist/cli.mjs server/scripts/recover-indexed-articles.ts --apply --limit=25
```

The default input is `exports/gsc-indexed-urls.json`. Override it with `--indexed-file=path.json`. The file must be an array of this site's HTTPS URLs. Non-article paths and noncanonical query/fragment URLs are excluded. Concurrency defaults to two and can be set from one to four. `--hosts=techcrunch.com,theguardian.com` can narrow a pilot to selected source publishers without expanding the indexed-URL allowlist.

## Providers

Gemini is used first (`gemini-3.1-flash-lite` by default), then Mistral (`mistral-small-latest`) if Gemini's quota is exhausted or the service fails. Model identifiers can be overridden with `GEMINI_MODEL` and `MISTRAL_MODEL`. Exhausted or invalid credentials are disabled for the remainder of that process. Mistral transient failures have bounded retries; exhausted providers leave the article held. Safety refusals do not trigger a fallback.

Both `GEMINI_API_KEY` / `MISTRAL_API_KEY` and the existing `Gamni_api_key` / `Mistral_api_key` names are supported. `Mistral_Name=Novexa` is an account label, not a model ID. Secrets stay in the existing server-side environment and are not logged. Normal feed jobs retain their current OpenAI configuration.

Gemini requests share an eight-second start interval across workers to reduce per-minute throttling. If both providers are unavailable, remaining items are reported as not attempted rather than repeatedly calling exhausted APIs. Rerun after the limit resets; already published records will be skipped.

The adapters use [Gemini structured JSON output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) and [Mistral custom structured output](https://docs.mistral.ai/studio/conversations/structured-output/custom).

## Safeguards

- Published, archived, redirected and unindexed records are excluded. Missing database records are listed for manual recovery, not reconstructed from their slugs.
- A live 404 is required before generation and again before saving. HTTP errors, redirects and successful pages are not treated as missing articles.
- Existing slugs, original publication dates, category and named Novexa authors are retained. Legacy external-publisher bylines become Novexa News Desk, with source attribution retained.
- Source text must be retrievable. Blocked or insufficient reporting remains held, without invented filler or bypassing publisher restrictions.
- Existing 600-word generation, source-link allowlist, content-quality, publish-readiness and indexability checks remain in force.
- Before applying, selected records are backed up in `backups/indexed-recovery-*.json`. Each replacement and its full revision snapshot are saved in one MongoDB transaction with an optimistic concurrency guard.
- Reports checkpoint after every processed article in `exports/indexed-recovery-*.json`. Failed attempts do not alter the database. Successfully restored records are automatically excluded on rerun.
- No social-media posting, redirect changes, deployment or Search Console submissions are triggered by this command.
