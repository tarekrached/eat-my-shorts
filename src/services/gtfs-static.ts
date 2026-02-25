/**
 * GTFS Static Data Service
 *
 * Downloads BART's GTFS static ZIP at runtime, parses routes.txt, trips.txt,
 * and stops.txt, and caches the lookup tables in localStorage.
 *
 * This runs in the browser — triggered on settings save or first load.
 */
import { unzipSync } from 'fflate'

// ── Types ────────────────────────────────────────────────────────────────

export interface GtfsRouteInfo {
  color: string      // e.g. "FF0000"
  hexcolor: string   // e.g. "#ff0000"
  shortName: string
  longName: string
}

export interface GtfsTripInfo {
  routeId: string
  directionId: number
  headsign: string
}

export interface GtfsStaticData {
  routes: Record<string, GtfsRouteInfo>
  trips: Record<string, GtfsTripInfo>
  /** Maps platform-level stop_id (e.g. "A30-1") to parent station abbr (e.g. "NBRK") */
  stopToStation: Record<string, string>
  fetchedAt: number  // unix ms
}

// ── Constants ────────────────────────────────────────────────────────────

// In dev, Vite proxies /proxy/gtfs-static/* to www.bart.gov/dev/schedules/*
// In production, a Cloudflare Worker proxies and adds CORS headers.
const isDev = import.meta.env.DEV
const CORS_PROXY = 'https://bart-cors-proxy.tarek-rached.workers.dev'
const GTFS_ZIP_URL = isDev
  ? '/proxy/gtfs-static/google_transit.zip'
  : `${CORS_PROXY}/gtfs-static/google_transit.zip`
const STORAGE_KEY = 'ems-gtfs-static'

// ── CSV parser ───────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => (obj[h] = values[i] ?? ''))
    return obj
  })
}

// ── Fetch & parse ────────────────────────────────────────────────────────

export async function fetchGtfsStaticData(): Promise<GtfsStaticData> {
  const response = await fetch(GTFS_ZIP_URL)
  if (!response.ok) {
    throw new Error(`GTFS ZIP fetch failed: ${response.status}`)
  }
  const buf = await response.arrayBuffer()
  const files = unzipSync(new Uint8Array(buf))

  const textOf = (name: string): string => {
    const entry = files[name]
    if (!entry) throw new Error(`${name} not found in GTFS ZIP`)
    return new TextDecoder().decode(entry)
  }

  // Parse routes.txt
  const routeRows = parseCsv(textOf('routes.txt'))
  const routes: Record<string, GtfsRouteInfo> = {}
  for (const r of routeRows) {
    routes[r.route_id] = {
      color: (r.route_color || '').toUpperCase(),
      hexcolor: r.route_color ? '#' + r.route_color.toLowerCase() : '',
      shortName: r.route_short_name || '',
      longName: r.route_long_name || '',
    }
  }

  // Parse trips.txt
  const tripRows = parseCsv(textOf('trips.txt'))
  const trips: Record<string, GtfsTripInfo> = {}
  for (const t of tripRows) {
    trips[t.trip_id] = {
      routeId: t.route_id,
      directionId: parseInt(t.direction_id, 10) || 0,
      headsign: t.trip_headsign || '',
    }
  }

  // Parse stops.txt — build mapping from platform stop_id to parent station abbr.
  // BART GTFS has parent stations (location_type=1, stop_id like "MONT")
  // and child platforms (location_type=0, parent_station="MONT", stop_id like "A30-1").
  const stopRows = parseCsv(textOf('stops.txt'))
  const stopToStation: Record<string, string> = {}
  for (const s of stopRows) {
    if (s.parent_station) {
      // This is a child/platform stop — map it to its parent
      stopToStation[s.stop_id] = s.parent_station
    } else {
      // Parent station — maps to itself
      stopToStation[s.stop_id] = s.stop_id
    }
  }

  const data: GtfsStaticData = { routes, trips, stopToStation, fetchedAt: Date.now() }
  saveToStorage(data)
  return data
}

// ── localStorage cache ───────────────────────────────────────────────────

function saveToStorage(data: GtfsStaticData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable — non-fatal
  }
}

export function loadFromStorage(): GtfsStaticData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GtfsStaticData
  } catch {
    return null
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
