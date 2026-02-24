# Eat My Shorts - BART Train Tracker

## Project Overview

**Eat My Shorts** is a single-page web application designed to track Bay Area Rapid Transit (BART) train times between home and work. It's optimized as a homescreen app on iOS and provides quick, easy access to train schedules and arrival estimates.

**Repository**: https://github.com/tarekrached/eat-my-shorts
**Author**: Tarek Rached

## Technology Stack

### Frontend Framework & Libraries
- **React 16.8.6**: Core UI framework using class components and hooks
- **Redux 4.0.1**: State management with thunk middleware for async operations
- **React-Redux 7.0.2**: Redux bindings for React
- **Redux-Thunk 2.3.0**: Middleware for async Redux actions
- **React-Router-DOM 5.0.0**: Client-side routing (hash-based routing with HashRouter)
- **React-Router-Redux 4.0.8**: Redux integration for routing

### Data & Utilities
- **Moment.js 2.24.0**: DateTime parsing, formatting, and relative time calculations
- **Axios 0.18.0**: HTTP client (though fetch API is currently used in code)
- **D3 5.9.2**: Data visualization library
- **D3-Geo 1.11.3**: Geographic calculations (geodesic distance, bearing)
- **Reselect 4.0.0**: Memoized selectors for Redux state

### Build & Deployment
- **React-Scripts 3.0.0**: Create React App build tooling
- **GH-Pages 2.0.1**: Deployment to GitHub Pages
- **Node 10+** (implicit from package.json)

## Project Structure

```
eat-my-shorts/
├── public/
│   ├── index.html           # Main HTML template
│   ├── manifest.json        # PWA manifest (iOS homescreen config)
│   └── favicon.ico
├── src/
│   ├── index.js             # App entry point with routing setup
│   ├── index.css            # Global styles
│   ├── store.js             # Redux store configuration
│   ├── registerServiceWorker.js  # Service worker registration
│   ├── actions/             # Redux async actions
│   │   ├── fetch-station-etds.js      # Fetch train arrival times
│   │   ├── fetch-bart-advisories.js   # Fetch BART service advisories
│   │   ├── update-settings.js         # Update user preferences
│   │   ├── get-user-location.js       # Request geolocation
│   │   ├── watch-user-location.js     # Watch location changes (unused)
│   │   └── index.js         # Action exports
│   ├── reducers/            # Redux state reducers
│   │   ├── settings.js      # User settings (current station, direction, etc)
│   │   ├── station-etds.js  # Train data by station
│   │   ├── bart-advisories.js # Service advisories
│   │   ├── user-location.js # User geolocation data
│   │   └── index.js         # Root reducer
│   ├── selectors/           # Memoized Redux selectors
│   │   ├── current-station-etds.js  # Filter/transform train data for current journey
│   │   ├── transfer-magic.js        # Multi-station transfer analysis
│   │   ├── closest-station.js       # Find nearest BART station
│   │   └── index.js         # Selector exports
│   ├── components/
│   │   ├── trip.js          # Main component - displays next trains
│   │   └── transfer-magic.js # Experimental feature - transfer analysis
│   ├── utilities/           # Helper functions & constants
│   │   └── index.js         # BART API URLs, settings presets, geo utilities
│   └── data/                # Static BART data
│       ├── bart-stations.json  # All BART stations with coordinates
│       └── bart-routes.json    # All BART routes and station sequences
├── etl/
│   └── fetch-bart-data.js   # ETL script to fetch/update station & route data
├── package.json             # Dependencies & scripts
├── package-lock.json        # Locked dependency versions
├── .gitignore               # Git ignore patterns
└── store.js                 # Empty placeholder (not used)
```

## Key Features

### 1. Main Trip View (`/`)
- **Display next trains**: Shows upcoming trains from configurable departure station in a specified direction
- **Train info**: Line color, destination, length (number of cars), time until departure, estimated arrival time
- **Time calculations**: Combines train time + walking time + boarding time to show total arrival time
- **Settings switching**: Toggle between "home2Work" and "work2Home" presets based on time of day
- **BART advisories**: Display service alerts from BART API
- **Data freshness**: Shows when train data was last fetched, refresh button
- **Quick links**: Station ETAs to all BART stops from current location
- **Auto-refresh**: Updates train times every 3 seconds via interval

### 2. Transfer Magic (`/transfer-magic`)
- **Experimental feature**: Analyzes connections between Oakland stations (12TH, 19TH, MCAR)
- **Source/Target trains**: Shows which trains can be caught from source stations to reach target trains
- **Multi-station view**: Displays timing information for transfer windows at each station

### 3. Auto-Switching Presets
- **Time-based**: Automatically selects "home2Work" preset if before noon, "work2Home" after noon
- **Configurable routes**: Two presets defined in utilities:
  - `home2Work`: NBRK (North Berkeley) → MONT (Montgomery) via South
  - `work2Home`: MONT → NBRK via North
- **Manual override**: User can click "switch" button to toggle presets

### 4. Geolocation Features (Partially Implemented)
- **Closest station**: Redux actions/reducers exist but not actively used in UI
- **Geo utilities**: Using D3-geo and custom bearing calculations to find nearest BART station
- **BART route topology**: Build adjacency graphs of stations using route data

## Data Flow & State Management

### Redux State Shape
```javascript
{
  settings: {
    preset: "home2Work" | "work2Home",
    currentBartStation: "NBRK" | "MONT",
    bartDirection: "North" | "South",
    bartMinutes: 25,           // Travel time on train
    walkingMinutes: 5 | 9,     // Walking time to/from station
    trainColors: ["RED", "YELLOW"],  // Optional filter (unused)
  },
  stationETDs: {
    [station]: {
      isFetching: boolean,
      trains: Train[],         // Parsed & enriched train data
      at: Moment,              // Time data was fetched
    }
  },
  bartAdvisories: {
    isFetching: boolean,
    bartAdvisories: string[],  // Alert messages
    error: Error | false,
  },
  userLocation: {
    isFetching: boolean,
    position: GeolocationCoordinates,
    error: Error | false,
  }
}
```

### Train Data Object Structure
```javascript
{
  minutes: "Leaving" | number,     // Raw response
  intMinutes: 0 | number,          // Parsed integer
  platform: string,                // "1", "2", etc
  direction: string,               // "North" or "South"
  length: number,                  // Cars in train
  color: "RED" | "BLUE" | etc,     // Line color name
  hexcolor: "#ff0000",             // Hex color code
  bikeflag: "1" | "0",             // Bike allowed?
  delay: string,                   // Delay info
  destination: string,             // Destination station name
  abbreviation: string,            // Station code (e.g., "WOAK")
  limited: string,                 // Limited service flag
  at: Moment,                      // Departure time (computed from API fetch time)
  etd: Moment,                     // Estimated time to destination (selector computed)
}
```

## BART API Integration

### Endpoints Used
1. **ETD (Estimated Time of Departure)**
   - URL: `https://api.bart.gov/api/etd.aspx?cmd=etd&orig={station}&dir={direction}&key={apiKey}&json=y`
   - Returns: Upcoming trains from a station in a given direction
   - Parsing: Extracts destinations → estimates → enriches with timestamps

2. **BSA (BART Service Advisories)**
   - URL: `https://api.bart.gov/api/bsa.aspx?cmd=bsa&key={apiKey}&json=y`
   - Returns: Current service alerts and advisories
   - Parsing: Extracts CDATA-wrapped description text

3. **Station & Route Data (ETL)**
   - Endpoints used by `etl/fetch-bart-data.js`:
     - `route.aspx?cmd=routeinfo&route=all` - All BART routes and station sequences
     - `stn.aspx?cmd=stns` - All BART stations with coordinates
   - Output: JSON files saved to `src/data/` for static bundling

### API Key
- Key: `MW9S-E7SL-26DU-VV8V` (exposed in code - BART provides public API key)
- Protocol-aware: Uses `window.location.protocol` to support both HTTP and HTTPS

## Selectors & Computed State

### currentStationEtdsSelector
- **Purpose**: Filters trains for current settings and adds arrival time calculation
- **Logic**:
  - Selects trains from `stationETDs[currentBartStation]`
  - Filters by color (if `trainColors` specified)
  - Adds `etd` (estimated time destination) = `at + bartMinutes + walkingMinutes`
  - Returns loading state if data not ready
- **Memoized**: Via reselect to prevent unnecessary re-renders

### transferMagicSelector
- **Purpose**: Analyzes transfer opportunities between Oakland stations
- **Logic**:
  - Hardcoded stations: 12TH, 19TH, MCAR
  - Hardcoded routes: Orange/Red trains (targets), Yellow trains (sources)
  - Groups trains by destination across stations
  - Identifies transfer windows where source train arrives before target train departs
- **Returns**: Target trains, source trains, station details with timing

### closestStationSelector
- **Purpose**: Finds nearest BART station using geolocation and D3-geo distance
- **Uses**: d3-geo.geoDistance() for geodesic distance calculations
- **Status**: Implemented but not actively used in UI

## Styling & UI/UX

### CSS Approach
- Single `index.css` file with minimal styling
- Mobile-first design (max-width: 398px for homescreen app)
- Color-coded train lines using `hexcolor` from API
- Responsive font sizing and spacing

### Key CSS Classes
- `.train`: Individual train display
- `.train span.color`: Small colored square indicating line
- `.train span.minutes`: Large, bold arrival time
- `.data-freshness`: Last update timestamp
- `.top-menu`: Navigation between views
- `.transfer-magic .stations`: Multi-station layout

### UI Design Philosophy
- **iPhone homescreen optimized**: Compact layout, touch-friendly buttons
- **Real-time updates**: Auto-refresh every 3 seconds
- **At-a-glance info**: Color indicators, relative times ("in 5 minutes")
- **Secondary info**: Grayed out text for car count, detailed timing

## Deployment

### Live Site
- **URL**: https://tarekrached.net/eat-my-shorts/
- The site is served via GitHub Pages from the `tarekrached/homepage` repo
- This repo (`eat-my-shorts`) is a **submodule** in the homepage repo, pointing to the `gh-pages` branch

### Deployment Steps
To deploy changes to production:

1. **Build and push to gh-pages branch:**
   ```bash
   npm run deploy
   ```
   This builds the app and pushes the dist files to the `gh-pages` branch.

2. **Update the submodule in the homepage repo:**

   First, check if the homepage repo is checked out as a sibling of this repo:
   ```bash
   ls ../homepage
   ```

   If it exists, update the submodule:
   ```bash
   cd ../homepage
   git submodule update --remote eat-my-shorts
   git add eat-my-shorts
   git commit -m "Update eat-my-shorts submodule"
   git push
   ```
   This updates the homepage repo to point to the latest gh-pages commit.

GitHub Pages will automatically rebuild and deploy the homepage site after the push.

### Progressive Web App (PWA)
- **Service Worker**: Registered in production for offline capability and caching
- **Manifest**: `public/manifest.json` enables "Add to Home Screen" on iOS
- **Display**: Standalone mode (appears as native app)
- **Start URL**: `./index.html`

### Build Output
- Optimized bundle via React-Scripts
- Service worker for offline access and asset caching
- Static assets (data files) bundled with app

## Development Workflow

### Scripts
```bash
npm start          # Start dev server (localhost:3000)
npm run build      # Build optimized production bundle
npm test           # Run tests (jsdom environment)
npm run eject      # Eject from Create React App (irreversible)
npm run deploy     # Build and deploy to GitHub Pages
npm run predeploy  # Runs before deploy (triggers build)
```

### Key Patterns

**Redux Thunk Actions**
- All async data fetching uses redux-thunk (fetch + dispatch pattern)
- Actions dispatch REQUEST, then RECEIVE/ERROR actions
- Consistent error handling with console.error()

**Moment.js Integration**
- Custom locale configuration for relative time ("5 seconds" not "5s")
- Used for time parsing, formatting, and calculations
- Cloned before mutations to maintain immutability

**Memoized Selectors**
- Critical for performance since selectors are called on every store change
- Reselect prevents downstream component re-renders if selected state hasn't changed

## Notable Implementation Details

### Train Time Parsing
- API returns `minutes` as either string "Leaving" or numeric string "5"
- Reducer converts to `intMinutes` (0 for "Leaving", parseInt otherwise)
- Actual departure timestamp calculated by adding minutes to API response fetch time

### Service Advisory Parsing
- BART BSA API returns advisories wrapped in CDATA sections
- Reducer extracts `data.root.bsa[].description["#cdata-section"]`
- Suggests XML response parsed as JSON (via CORS proxy or converter)

### Unused/Partially Implemented Features
- **Location watching**: `watch-user-location.js` imported but not used
- **Closest station**: `closest-station.js` and `get-user-location.js` implemented but no UI integration
- **Train color filtering**: `trainColors` config exists but mostly unused
- **Axios**: Listed in dependencies but fetch API used instead

### Historical Context
- Based on earlier BART Chrome Extension (commit: "initial commit - feature parity with bart-chrome-extension")
- Transfer Magic feature appears experimental (several commits on/off)
- Recent changes focused on deployment (custom domain, homepage path)

## Configuration & Customization

### Settings Presets
Located in `src/utilities/index.js`:
```javascript
settingsPresets = [
  {
    preset: "home2Work",
    currentBartStation: "NBRK",
    bartDestination: "MONT",
    bartMinutes: 25,
    bartDirection: "South",
    walkingMinutes: 5,
  },
  {
    preset: "work2Home",
    currentBartStation: "MONT",
    bartDestination: "NBRK",
    bartMinutes: 25,
    bartDirection: "North",
    trainColors: ["RED", "YELLOW"],
    walkingMinutes: 9,
  },
]
```

### Travel Times
In `Trip.js`, render shows custom travel time configuration:
- `bartMinutes`: Time on train (typically 25)
- `walkingMinutes`: Pre-travel and post-travel walking (5-9 mins)

### Station List
`stationsHome` array in utilities defines which stations appear in the "en-route times" section, showing transit time from North Berkeley to each stop.

## Browser Support & Environment

- **Target**: iOS Safari for homescreen app usage
- **Browserlist**: 
  - Production: >0.2%, not dead, not op_mini
  - Development: Latest Chrome, Firefox, Safari
- **ES Version**: ES6/ES2015 (via react-scripts transpilation)
- **Redux DevTools**: Supported in development (checks `window.devToolsExtension`)

## Performance Considerations

- **Auto-refresh interval**: 3 seconds (aggressive, may impact battery life on homescreen)
- **Memoized selectors**: Prevent unnecessary recalculations
- **Service worker caching**: Assets cached for faster load/offline use
- **Minimal dependencies**: Small bundle size suitable for mobile

## Security Notes

- **BART API Key**: Public, hardcoded (BART provides public API key, acceptable)
- **Geolocation**: Requests with browser permission prompt
- **CORS**: All API calls to bart.gov (likely uses CORS or is server-side proxied)

## Future Enhancement Opportunities

1. **Actual geo-closest station**: Activate and integrate the unused geolocation selectors
2. **Real-time updates**: Consider WebSockets instead of polling interval
3. **Configurable settings UI**: Allow users to customize stations and travel times in-app (currently hardcoded)
4. **Transfer Magic completion**: Polish and document the transfer analysis feature
5. **Performance**: Increase refresh interval, add refresh rate setting
6. **Testing**: No test files found - could add Jest/Enzyme tests
7. **Modern React**: Migrate from class components to functional components with hooks
8. **Type safety**: Add Flow or TypeScript types
9. **Accessibility**: Add ARIA labels, keyboard navigation
10. **Analytics**: Track usage patterns (with privacy considerations)

---

Last updated: [Generation timestamp]
Explored by: Claude Code Analysis Agent
Thoroughness Level: Very Thorough
