# Eat My Shorts - BART Train Tracker

## Project Overview

**Eat My Shorts** is a single-page web application designed to track Bay Area Rapid Transit (BART) train times between home and work. It's optimized as a homescreen app on iOS and provides quick, easy access to train schedules and arrival estimates.

**Repository**: https://github.com/tarekrached/eat-my-shorts
**Author**: Tarek Rached

## Technology Stack

### Frontend Framework & Libraries
- **React 18.3**: Functional components with hooks
- **TypeScript 5.6**: Full type safety across the codebase
- **Redux Toolkit 2.3**: State management with `createSlice` and `createAsyncThunk`
- **React-Redux 9.1**: Redux bindings (typed `useSelector`/`useDispatch`)
- **React-Router-DOM 6.28**: Client-side routing (hash-based with `HashRouter`)
- **Reselect 5.1**: Memoized selectors for derived state

### Data & Utilities
- **Day.js 1.11**: DateTime calculations and relative time (replaced Moment.js)
- **protobufjs 8.0**: GTFS-RT protobuf decoding
- **fflate 0.8**: In-browser ZIP decompression for GTFS static data
- **D3 7.9 / D3-Geo 3.1**: Geographic calculations (geodesic distance, bearing)

### Build & Deployment
- **Vite 5.4**: Dev server with CORS proxy, production bundler
- **vite-plugin-pwa 0.20**: Service worker generation and PWA manifest
- **GitHub Actions**: CI/CD pipeline deploys to GitHub Pages on push to `main`
- **Cloudflare Workers**: CORS proxy for BART GTFS endpoints in production
- **Node 20** (used in CI)

## Project Structure

```
eat-my-shorts/
├── src/
│   ├── main.tsx                # Entry point: React root, routing, dayjs config, GTFS static bootstrap
│   ├── index.css               # Global styles (mobile-first)
│   ├── vite-env.d.ts           # Vite type declarations
│   ├── components/
│   │   ├── Trip.tsx            # Main view — train departures with countdown
│   │   ├── TransferMagic.tsx   # Transfer analysis between Oakland stations
│   │   └── Settings.tsx        # Settings page — stations, walking times, filters
│   ├── store/
│   │   ├── index.ts            # Redux store (configureStore)
│   │   ├── settingsSlice.ts    # User settings (presets, stations, walking times)
│   │   ├── gtfsRtSlice.ts      # GTFS-RT state (trip updates, alerts, static data)
│   │   └── userLocationSlice.ts # Geolocation state
│   ├── selectors/
│   │   ├── index.ts            # Re-exports
│   │   ├── currentStationEtds.ts  # Filter/enrich trains for current journey
│   │   ├── transferMagic.ts       # Transfer window analysis
│   │   └── closestStation.ts      # Nearest BART station by geolocation
│   ├── services/
│   │   ├── gtfs-rt.ts          # Fetch & decode GTFS-RT protobuf feeds
│   │   └── gtfs-static.ts      # Fetch & parse GTFS static ZIP (routes, trips, stops)
│   ├── types/
│   │   ├── index.ts            # Re-exports
│   │   ├── redux.ts            # RootState, Settings, GtfsRtState, EnrichedTrain, etc.
│   │   └── bart-api.ts         # BartStation, BartRoute, UserPosition
│   ├── utilities/
│   │   └── index.ts            # Default presets, direction inference, geo helpers
│   └── data/
│       ├── bart-stations.json  # All BART stations with coordinates
│       ├── bart-routes.json    # All BART routes and station sequences
│       ├── gtfs-rt.js          # Compiled protobuf decoder (generated from .proto)
│       └── gtfs-rt.d.ts        # TypeScript declarations for protobuf decoder
├── worker/                     # Cloudflare Worker — CORS proxy for production
│   ├── src/index.ts            # Worker script (~50 lines)
│   ├── wrangler.toml           # Cloudflare config (name: bart-cors-proxy)
│   ├── package.json            # wrangler + @cloudflare/workers-types
│   └── tsconfig.json
├── proto/                      # GTFS-RT protobuf definitions
├── etl/
│   └── fetch-bart-data.js      # ETL script to refresh station/route JSON from BART API
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions → GitHub Pages deployment
├── vite.config.ts              # Vite config with CORS proxy and PWA plugin
├── package.json
└── tsconfig.json
```

## Key Features

### 1. Main Trip View (`/`)
- **Real-time departures**: Shows upcoming trains from your station via GTFS-RT protobuf
- **Train info**: Color-coded line, destination, seconds countdown to departure, "leave by" time, estimated arrival
- **Walking time calculation**: Shows when you need to leave (departure minus walking time)
- **Preset switching**: Toggle between "home → work" and "work → home"
- **BART advisories**: GTFS-RT service alerts
- **Data freshness**: Shows when data was last fetched, with a Reload button
- **Configurable polling**: Default 60s, adjustable from 15s to 5min in settings

### 2. Transfer Magic (`/transfer-magic`)
- **Experimental feature**: Analyzes transfer windows between Oakland stations (12TH, 19TH, MCAR)
- **Source/Target trains**: Shows which Yellow line trains can connect to Orange/Red line trains heading North
- **Per-station breakdown**: Departure times at each station for both source and target trains

### 3. Settings Page (`/settings`)
- **Home/work station selection**: Dropdown of all BART stations
- **Walking times**: Minutes to walk from each station
- **Auto-switch**: Toggle presets by time of day (configurable hour)
- **Polling interval**: 15s / 30s / 60s / 2min / 5min
- **Train line filter**: Checkboxes for Red, Orange, Yellow, Green, Blue
- **Auto-computed**: Direction and travel time are inferred from station pair via BART Schedule API and route data

### 4. Auto-Switching Presets
- **Time-based**: Selects "home → work" before a configurable hour (default noon), "work → home" after
- **Configurable**: Two presets with station, direction, and travel time
- **Manual override**: Click "switch" to toggle

## Data Flow & State Management

### Redux State Shape
```typescript
interface RootState {
  settings: Settings        // User prefs, active preset, stations, walking times
  gtfsRt: GtfsRtState       // Trip updates, alerts, GTFS static cache
  userLocation: UserLocationState  // Geolocation (partially implemented)
}
```

### Settings State
```typescript
interface Settings {
  activePresetIndex: 0 | 1
  presets: [TripPreset, TripPreset]   // home→work, work→home
  autoSwitch: boolean
  autoSwitchHour: number
  homeStation: string                  // e.g. "NBRK"
  workStation: string                  // e.g. "MONT"
  homeWalkingMinutes: number
  workWalkingMinutes: number
  pollingIntervalSeconds: number
  // Flattened from active preset (read by selectors):
  currentBartStation: string
  bartDirection: Direction
  bartMinutes: number
  trainColors?: TrainColor[]
}
```

### GTFS-RT State
```typescript
interface GtfsRtState {
  isFetching: boolean
  tripUpdates: GtfsTripUpdate[]   // Decoded protobuf trip updates
  alerts: string[]                 // Service advisory text
  fetchedAt: Dayjs | null
  error: string | null
  gtfsStatic: GtfsStaticData | null   // Cached route/trip/stop lookups
  gtfsStaticError: string | null
}
```

### Enriched Train (selector output)
```typescript
interface EnrichedTrain {
  tripId: string
  routeId: string
  color: string            // e.g. "RED"
  hexcolor: string         // e.g. "#ff0000"
  destination: string      // Last stop name
  direction: Direction
  at: Dayjs                // Departure time at this stop
  intMinutes: number       // Minutes until departure
  secondsUntilDeparture: number
  leaveBy: Dayjs           // Latest time to leave (departure - walking time)
  etd: Dayjs               // Estimated arrival at destination
}
```

## BART API Integration

### GTFS-RT Feeds (primary data source)
Real-time train data comes from BART's GTFS-RT protobuf feeds:

1. **Trip Updates** — `api.bart.gov/gtfsrt/tripupdate.aspx`
   - Binary protobuf, decoded with `transit_realtime.FeedMessage`
   - Contains per-trip stop time updates (arrival/departure unix timestamps)
   - Polled every 60s (configurable)

2. **Alerts** — `api.bart.gov/gtfsrt/alerts.aspx`
   - Binary protobuf with service advisories
   - Polled alongside trip updates

### GTFS Static Data
Route metadata, trip headsigns, and stop-to-station mapping:

3. **Static ZIP** — `www.bart.gov/dev/schedules/google_transit.zip`
   - ~770KB ZIP containing `routes.txt`, `trips.txt`, `stops.txt`
   - Downloaded in-browser, decompressed with fflate, parsed as CSV
   - Cached in localStorage, refreshed on settings save
   - Maps platform stop IDs (e.g. "A30-1") to station abbreviations (e.g. "NBRK")
   - Also extracts station names (e.g. "NBRK" → "North Berkeley") for display

### BART Schedule API (used in settings)
4. **Schedule lookup** — `api.bart.gov/api/sched.aspx`
   - JSON API used to compute travel time between two stations
   - Called when saving settings (not during normal polling)
   - Uses public API key `MW9S-E7SL-26DU-VV8V`
   - Proxied through the same CORS proxy as GTFS endpoints (see below)

### CORS Proxy

BART's GTFS-RT and static endpoints don't include CORS headers.

- **Development**: Vite's dev server proxies requests:
  - `/proxy/gtfsrt/*` → `api.bart.gov/gtfsrt/*` (via Vite proxy config)
  - `/proxy/gtfs-static/*` → `www.bart.gov/dev/schedules/*` (via custom Vite middleware that follows redirects)
  - `/proxy/bart-api/*` → `api.bart.gov/api/*` (schedule API, via Vite proxy config)

- **Production**: A Cloudflare Worker at `https://bart-cors-proxy.tarek-rached.workers.dev` proxies requests:
  - `/gtfsrt/*` → `https://api.bart.gov/gtfsrt/*`
  - `/gtfs-static/*` → `https://www.bart.gov/dev/schedules/*`
  - `/bart-api/*` → `https://api.bart.gov/api/*`

The worker source is in `worker/src/index.ts`. It adds `Access-Control-Allow-Origin: *` to all responses and handles OPTIONS preflight. Deployed manually via `cd worker && npx wrangler deploy`.

## Selectors & Computed State

### currentStationEtdsSelector
- **Purpose**: Filters GTFS-RT trip updates for the active station/direction, enriches with timing
- **Logic**:
  - Filters `tripUpdates` where the trip serves `currentBartStation`
  - Determines direction from stop sequence (uses `inferDirection` on consecutive stops, not GTFS `direction_id`)
  - Applies `trainColors` filter if set
  - Resolves destination names from `gtfsStatic.stationNames` (dynamic, from GTFS stops.txt)
  - Computes `leaveBy` (departure minus walking time) and `etd` (departure plus train time plus destination walking time)
  - Hides trains that departed more than 60s ago
  - Sorts by departure time

### transferMagicSelector
- **Purpose**: Analyzes transfer opportunities at Oakland stations
- **Logic**:
  - Hardcoded stations: 12TH, 19TH, MCAR
  - Target: Orange/Red trains heading North
  - Source: Yellow trains heading North
  - Groups trains by station, computes per-station departure minutes

### closestStationSelector
- **Purpose**: Finds nearest BART station using geolocation and D3-geo
- **Status**: Implemented but not used in UI

## Styling & UI/UX

### CSS Approach
- Single `index.css` file
- Mobile-first design (max-width: 398px for homescreen app)
- Color-coded train lines using `hexcolor` from GTFS data
- `.missed` class for trains you can no longer catch (grayed out)

### Key CSS Classes
- `.train`: Flexbox row with color swatch, countdown, destination (truncates with ellipsis), arrival
- `.leave-by`: Walking person emoji + minutes until you need to leave
- `.train-departs`: Train emoji + minutes/seconds until departure
- `.seconds`: Seconds counter shown for first two trains only
- `.data-freshness`: Last-updated timestamp with reload button
- `.settings-page`: Settings form layout
- `.line-filters`: Train color checkbox group with colored swatches

## Deployment

### Frontend — GitHub Pages (automatic)
- **Live URL**: https://tarekrached.github.io/eat-my-shorts/
- Deployed via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`
- Workflow: `npm ci && npm run build` → upload `dist/` → deploy to Pages
- Manual trigger available via `workflow_dispatch`

### CORS Proxy — Cloudflare Worker (manual)
- **Live URL**: https://bart-cors-proxy.tarek-rached.workers.dev
- Source: `worker/src/index.ts`
- Deploy: `cd worker && npx wrangler deploy`
- Free tier: 100k requests/day (more than enough)
- The worker is NOT part of the GitHub Actions pipeline

### Progressive Web App (PWA)
- **Service Worker**: Generated by vite-plugin-pwa, auto-updates
- **Manifest**: Configured in `vite.config.ts` (standalone display, homescreen icon)
- **Start URL**: `.`

### Build Output
- Optimized bundle via Vite with sourcemaps
- Service worker for offline access and asset caching
- Base path: `/eat-my-shorts/` (configured in `vite.config.ts`)

## Development Workflow

### Scripts
```bash
npm run dev        # Vite dev server with BART API CORS proxy
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
```

### Worker scripts (from worker/ directory)
```bash
npx wrangler dev     # Local worker dev server (port 8787)
npx wrangler deploy  # Deploy to Cloudflare
```

### Key Patterns

**Redux Toolkit Slices**
- `settingsSlice.ts`: Synchronous reducers for presets, stations, walking times. Persists to localStorage on every action.
- `gtfsRtSlice.ts`: Async thunks (`fetchGtfsRtData`, `refreshGtfsStatic`) with pending/fulfilled/rejected handlers.

**GTFS-RT Protobuf Decoding**
- `src/data/gtfs-rt.js` is a compiled protobuf decoder (generated from `proto/` definitions via `pbjs`)
- `src/data/gtfs-rt.d.ts` provides TypeScript types
- Decoding: `transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer))`

**GTFS Static ZIP Parsing**
- Downloaded as binary, decompressed with `fflate.unzipSync()`
- CSV files parsed with a custom parser (handles quoted fields)
- Cached in localStorage under `ems-gtfs-static` key

**Day.js Integration**
- Extended with `relativeTime` plugin for "X minutes ago" display
- Used for all time arithmetic (departure times, countdowns, ETAs)
- `dayjs.unix()` converts GTFS-RT unix timestamps

**Memoized Selectors**
- `createSelector` from reselect prevents expensive recalculations
- Critical because Trip component re-renders every 1s for countdown ticking

**Direction Inference**
- `inferDirection(from, to)` walks bundled route data to determine North/South
- Used both in settings (to auto-compute direction) and in `currentStationEtdsSelector` (to filter by direction using consecutive stops rather than GTFS `direction_id`)

## Configuration & Customization

### Default Presets
Defined in `src/utilities/index.ts`:
```typescript
const defaultPresets: [TripPreset, TripPreset] = [
  { name: 'home → work', currentBartStation: 'NBRK', bartMinutes: 25, bartDirection: 'South' },
  { name: 'work → home', currentBartStation: 'MONT', bartMinutes: 25, bartDirection: 'North' },
]
```

### Persistence
Settings are persisted to localStorage under `ems-settings`. GTFS static data is cached under `ems-gtfs-static`.

## Browser Support & Environment

- **Target**: iOS Safari for homescreen app usage
- **Browserslist**: Production: >0.2%, not dead, not op_mini all
- **Redux DevTools**: Supported via Redux Toolkit's default middleware

## Notable Implementation Details

### Stop ID Mapping & Station Names
BART's GTFS data uses platform-level stop IDs (e.g. "A30-1") while the app works with station abbreviations (e.g. "NBRK"). The `stopToStation` mapping from GTFS static `stops.txt` translates between them. Station display names (e.g. "North Berkeley") are also extracted from `stops.txt` into `stationNames` — this is the primary source for destination labels and Settings dropdowns, with `bart-stations.json` as a fallback before the GTFS ZIP loads.

### Direction from Stop Sequence
Rather than relying on GTFS `direction_id` (which can be inconsistent), the selector determines a train's direction at a station by looking at the next stop in the trip's sequence and using `inferDirection()` against the bundled route topology.

### 1-Second Re-render Tick
`Trip.tsx` uses a separate `setInterval` at 1s to trigger re-renders for smooth countdown display, independent of the GTFS-RT polling interval.

### Partially Implemented Features
- **Closest station**: Selector and geolocation slice exist but no UI integration
- **D3-geo utilities**: Bearing/distance calculations implemented but unused
