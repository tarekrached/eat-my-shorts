# Eat My Shorts - BART Train Tracker

Single-page app tracking BART train times between home and work, used as an iOS homescreen app. Live at https://tarekrached.github.io/eat-my-shorts/.

## External services and CORS

BART's GTFS-RT and static endpoints don't send CORS headers, so all BART API calls go through a proxy:

- **Dev**: Vite proxies `/proxy/gtfsrt` and `/proxy/bart-api` (see `vite.config.ts`). The GTFS static ZIP needs a custom middleware instead of the plain Vite proxy, because BART redirects `google_transit.zip` to a versioned URL and `http-proxy` doesn't follow redirects — Node's native `fetch` (which does) handles it.
- **Prod**: a Cloudflare Worker at `https://bart-cors-proxy.tarek-rached.workers.dev` (source: `worker/src/index.ts`) adds `Access-Control-Allow-Origin: *` and handles OPTIONS preflight. It is **not** part of the GitHub Actions pipeline — deploy it manually with `cd worker && npx wrangler deploy`.

The BART Schedule API call (used when saving settings) uses BART's public demo key `MW9S-E7SL-26DU-VV8V`, hardcoded — it's their published sample key, not a secret, so there's no env var to manage.

`src/data/gtfs-rt.js` is a compiled protobuf decoder generated from `proto/` via `pbjs`. Don't hand-edit it; regenerate it instead.

## Transfer Magic gotchas

These cost real debugging time and aren't obvious from reading the selector code cold:

- **`direction_id` is useless on BART's RT feed** — every trip reports `direction_id: 0`, so `GtfsTripUpdate.direction` is always `'South'` and filtering on it matches nothing. Use stop-sequence order (`inferDirection`, used by `currentStationEtdsSelector`) or destination reachability (used by `transferMagicSelector`) instead.
- **Line color doesn't imply direction** — Red is both Richmond-bound and Millbrae-bound, Orange is both Richmond-bound and Berryessa-bound, at the same stations in the same feed. Test the stop sequence, not the color.
- **Connection buffer** (`settings.transferBufferSeconds`, default 0) may legitimately be negative. The wye platforms are ~30ft apart so a transfer costs no real time, and a negative buffer accepts a train scheduled to leave just before you land but often still there. Two earlier versions used a `minTransferMinutes` floor (3, then 1, with a 60s hard floor) framed as "avoiding sprints" — that model was wrong, there's no sprint and no floor. The old storage key was abandoned rather than migrated, so don't expect to find it.
- **Track view countdowns need sub-minute precision** — they render as `m:ss` under 10 minutes and tick every second, because rounded minutes can't express the 10-15s margins the view exists to show.
- **Inline Preview** (`/inline`) is experimental and deliberately self-contained in `selectors/inlinePreview.ts` + `components/InlinePreview.tsx` so it can be deleted cleanly if the verdict goes against it. It also carries in-memory, per-session drift instrumentation (predicted arrival vs. actual, station-changed count) that resets on reload — don't expect it to persist.

## Other implementation notes

- `Trip.tsx` runs its own 1s `setInterval` purely to re-render the countdown display; this is independent of (and much faster than) the GTFS-RT polling interval, so don't conflate the two when debugging refresh behavior.
- Platform-level GTFS stop IDs (e.g. `"A30-1"`) are mapped to station abbreviations (e.g. `"NBRK"`) via `stopToStation`, built from GTFS static `stops.txt`. Station display names come from the same source, with `bart-stations.json` as a fallback before the GTFS ZIP has loaded.
- `closestStationSelector` and the D3-geo bearing/distance utilities are implemented but not wired into any UI — they're dead code on purpose, not a bug.
- Settings persist to localStorage under `ems-settings`; cached GTFS static data under `ems-gtfs-static`.

## Deployment

- **Frontend (GitHub Pages)**: automatic via `.github/workflows/deploy.yml` on push to `main` (`npm ci && npm run build` → `dist/` → Pages). Manual trigger available via `workflow_dispatch`.
- **CORS proxy (Cloudflare Worker)**: manual only — `cd worker && npx wrangler deploy`. Free tier (100k req/day) is more than enough; it is not wired into CI.
