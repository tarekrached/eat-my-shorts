# Eat My Shorts — BART Train Tracker

A mobile-first web app for tracking Bay Area Rapid Transit (BART) train times between home and work. Optimized as an iOS homescreen app for quick, at-a-glance train schedules and arrival estimates.

**Live site:** https://tarekrached.github.io/eat-my-shorts/

## Features

- **Real-time train departures** via GTFS-RT protobuf feeds — shows upcoming trains from your station with color-coded lines, seconds countdown, and estimated arrival at your destination
- **Configurable settings** — pick home/work stations, walking times, polling interval, and train line filters from an in-app settings page
- **Auto-switching presets** — automatically toggles between "home → work" and "work → home" based on time of day
- **Transfer analysis** — experimental view analyzing transfer windows between Oakland stations (12th St, 19th St, MacArthur)
- **BART service alerts** — displays real-time advisories from GTFS-RT alert feed
- **PWA** — installable as a homescreen app with offline caching via service worker

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Redux Toolkit** for state management
- **GTFS-RT** (protobuf) for real-time data, **GTFS static** ZIP for route/trip metadata
- **Day.js** for time calculations
- **Reselect** for memoized selectors
- **Cloudflare Worker** as a CORS proxy for BART endpoints in production

## Quick Start

```bash
npm install
npm run dev
```

The Vite dev server proxies BART API requests locally, so no CORS issues in development.

## Project Structure

```
eat-my-shorts/
├── src/
│   ├── main.tsx                # Entry point, routing, dayjs config
│   ├── index.css               # Global styles
│   ├── components/
│   │   ├── Trip.tsx            # Main view — train departures
│   │   ├── TransferMagic.tsx   # Transfer analysis view
│   │   └── Settings.tsx        # Settings page
│   ├── store/
│   │   ├── index.ts            # Redux store (configureStore)
│   │   ├── settingsSlice.ts    # User settings (presets, stations, walking times)
│   │   ├── gtfsRtSlice.ts      # GTFS-RT state (trip updates, alerts, static data)
│   │   └── userLocationSlice.ts
│   ├── selectors/
│   │   ├── currentStationEtds.ts  # Filter/enrich trains for current journey
│   │   ├── transferMagic.ts       # Transfer window analysis
│   │   └── closestStation.ts      # Nearest station by geolocation
│   ├── services/
│   │   ├── gtfs-rt.ts          # Fetch & decode GTFS-RT protobuf feeds
│   │   └── gtfs-static.ts      # Fetch & parse GTFS static ZIP (routes, trips, stops)
│   ├── types/
│   │   ├── index.ts            # Re-exports
│   │   ├── redux.ts            # RootState, Settings, EnrichedTrain, etc.
│   │   └── bart-api.ts         # BartStation, BartRoute, UserPosition
│   ├── utilities/
│   │   └── index.ts            # Presets, direction inference, geo helpers
│   └── data/
│       ├── bart-stations.json  # All BART stations with coordinates
│       ├── bart-routes.json    # All BART routes and station sequences
│       ├── gtfs-rt.js          # Compiled protobuf decoder
│       └── gtfs-rt.d.ts        # TypeScript types for protobuf
├── worker/                     # Cloudflare Worker — CORS proxy
│   ├── src/index.ts            # Worker script (~50 lines)
│   ├── wrangler.toml           # Cloudflare config
│   ├── package.json            # wrangler dependency
│   └── tsconfig.json
├── etl/
│   └── fetch-bart-data.js      # Script to refresh station/route JSON
├── proto/                      # Protobuf definitions for GTFS-RT
└── .github/workflows/
    └── deploy.yml              # GitHub Actions → GitHub Pages
```

## Architecture

### Data Flow

1. **GTFS static data** (routes, trips, stops) is fetched once as a ZIP from BART, parsed in-browser, and cached in localStorage
2. **GTFS-RT feeds** (trip updates + alerts) are fetched as protobuf every 60s (configurable), decoded with protobufjs, and enriched with static lookup data
3. **Selectors** filter trips by station, direction, and line color, then compute departure countdowns and arrival estimates
4. **Components** re-render every 1s for smooth countdown ticking

### CORS Proxy

BART's GTFS-RT and static endpoints don't include CORS headers. This is handled differently per environment:

- **Development:** Vite's dev server proxies requests (configured in `vite.config.ts`)
- **Production:** A Cloudflare Worker at `bart-cors-proxy.tarek-rached.workers.dev` proxies requests and adds CORS headers

The worker is deployed manually — see [Worker Deployment](#worker-deployment).

## Deployment

### Frontend (automatic)

Push to `main` triggers GitHub Actions: `npm ci && npm run build` → deploy `dist/` to GitHub Pages.

### Worker Deployment

The Cloudflare Worker is deployed manually (not part of CI):

```bash
cd worker
npx wrangler login   # one-time auth
npx wrangler deploy  # deploy to workers.dev
```

The worker rarely needs updating — it's a simple CORS proxy that maps paths to upstream BART URLs.

## Scripts

```bash
npm run dev        # Vite dev server with BART API proxy
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
```
