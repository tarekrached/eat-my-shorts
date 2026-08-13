# Eat My Shorts — BART Train Tracker

A mobile-first web app for tracking Bay Area Rapid Transit (BART) train times between home and work. Optimized as an iOS homescreen app for quick, at-a-glance train schedules and arrival estimates.

**Live site:** https://tarekrached.github.io/eat-my-shorts/

## Features

- **Real-time train departures** via GTFS-RT protobuf feeds — shows upcoming trains from your station with color-coded lines, seconds countdown, and estimated arrival at your destination
- **Configurable settings** — pick home/work stations, walking times, polling interval, and train line filters from an in-app settings page
- **Auto-switching presets** — automatically toggles between "home → work" and "work → home" based on time of day
- **Transfer Magic** — tells you which Oakland station to get off at when the train you're on doesn't reach your destination ([details](#transfer-magic))
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
├── tools/
│   └── generate-icons.mjs      # Regenerates every app icon in public/
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

### Transfer Magic

Coming home from SF on a Yellow (Antioch/Pittsburg) train, you can't stay on it — it turns east at MacArthur and never reaches a Richmond-line station. You get three chances to change trains in the Oakland wye: 12th St, 19th St, MacArthur. Transfer Magic answers the one question that actually matters while you're in the tube: **which one do I get off at?**

Pick the train you're on (it defaults to the next one heading into Oakland), and each station shows when you'd arrive, how long you'd wait, which onward train you'd catch, and when you'd be home. The recommended station is the one that gets you home soonest.

The interesting part is the tie. Most of the time all three stations catch the *same* onward train, so the arrival time is identical and the earliest station wins outright — you board several minutes ahead of everyone who stayed on, which is the difference between a seat and a shoulder. The view labels those stations "same train" and calls the verdict "beat the rush". Less often, an earlier station catches a strictly earlier train that's already gone by the time you'd reach the later stops, and the verdict says how many minutes that saves.

Two things `transferMagicSelector` deliberately does not do, both learned the hard way:

- **It ignores GTFS `direction_id`.** BART publishes `direction_id: 0` on every trip in the realtime feed, so a `direction === 'North'` filter matches nothing at all. This is what made the view render blank.
- **It doesn't filter onward trains by line color.** Roughly half the Red trains through Oakland are Millbrae-bound and half the Orange trains are Berryessa-bound; the color alone doesn't tell you which way a train is going. Instead, a trip counts as a connection if its own remaining stop sequence contains your destination station — one test that handles direction and line branching together.

Your destination comes from the active preset (the far end of it), so the view follows your settings rather than hardcoding North Berkeley.

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

## Icons

Every icon in `public/` is generated from a single vector source. Don't edit the PNGs by hand, rerun the generator:

```bash
node tools/generate-icons.mjs
```

It writes `apple-touch-icon.png` (180px, what iOS uses on the Home Screen), `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512.png`, `favicon.svg`, and a multi-size `favicon.ico`. Rasterising goes through headless Chrome, which handles SVG far more faithfully than ImageMagick's built-in renderer; ImageMagick is used only to pack the `.ico`. Requires Google Chrome and `magick` on PATH.

Two invariants in the script are commented in place and easy to break by accident. The crotch notch apex is derived as `top + 2 * bandHeight` so it lands exactly on a stripe seam, and the stripe bands overlap downward only. Both exist to stop a colour band bridging the gap between the legs, which is invisible at icon size and obvious when magnified.

The maskable variant renders at a reduced scale so its art fits inside the centred 80% circle Android crops to. The standard 512 would lose about 3,500 pixels to that crop.

iOS snapshots the Home Screen icon at install time and never refetches it. Changing the icon means existing installs need to be removed and re-added.

## Scripts

```bash
npm run dev        # Vite dev server with BART API proxy
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
```
