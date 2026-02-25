/**
 * GTFS-RT Service
 *
 * Fetches real-time BART trip updates and alerts via GTFS-RT protobuf,
 * decodes them, and enriches with static GTFS lookup data.
 */
import { transit_realtime } from '../data/gtfs-rt'
import type { GtfsStaticData } from './gtfs-static'
import type { Direction } from '../types'

// ── Types ────────────────────────────────────────────────────────────────

export interface GtfsStopUpdate {
  stopId: string
  arrivalTime: number    // unix seconds
  departureTime: number  // unix seconds
  stopSequence: number
}

export interface GtfsTripUpdate {
  tripId: string
  routeId: string
  directionId: number
  direction: Direction
  color: string           // e.g. "RED" (mapped from hex)
  hexcolor: string        // e.g. "#ff0000"
  destination: string     // trip headsign or last stop
  stopUpdates: GtfsStopUpdate[]
}

// ── Constants ────────────────────────────────────────────────────────────

// In dev, Vite proxies /proxy/gtfsrt/* to api.bart.gov/gtfsrt/* to avoid CORS.
// In production, a Cloudflare Worker proxies and adds CORS headers.
const isDev = import.meta.env.DEV
const CORS_PROXY = 'https://bart-cors-proxy.tarek-rached.workers.dev'
const TRIP_UPDATE_URL = isDev
  ? '/proxy/gtfsrt/tripupdate.aspx'
  : `${CORS_PROXY}/gtfsrt/tripupdate.aspx`
const ALERTS_URL = isDev
  ? '/proxy/gtfsrt/alerts.aspx'
  : `${CORS_PROXY}/gtfsrt/alerts.aspx`

// Map direction_id to our Direction type.
// BART convention: 0 = South (SF-bound), 1 = North (East Bay-bound)
const DIRECTION_MAP: Record<number, Direction> = { 0: 'South', 1: 'North' }

// Map hex color codes to human-readable color names used by BART legacy API.
// These are the BART line colors as of 2024.
const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#ed1c24': 'RED',
  '#ff0000': 'RED',
  '#faa61a': 'ORANGE',
  '#ff9933': 'ORANGE',
  '#ffe800': 'YELLOW',
  '#ffff33': 'YELLOW',
  '#4db848': 'GREEN',
  '#339933': 'GREEN',
  '#00aeef': 'BLUE',
  '#0099cc': 'BLUE',
}

function hexToColorName(hex: string): string {
  const lower = hex.toLowerCase()
  return HEX_TO_COLOR_NAME[lower] || lower.toUpperCase()
}

// ── Fetch & decode ───────────────────────────────────────────────────────

export async function fetchTripUpdates(
  gtfsStatic: GtfsStaticData | null
): Promise<GtfsTripUpdate[]> {
  const response = await fetch(TRIP_UPDATE_URL)
  if (!response.ok) throw new Error(`GTFS-RT fetch failed: ${response.status}`)
  const buf = await response.arrayBuffer()
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buf))

  return (feed.entity || [])
    .filter((e) => e.tripUpdate)
    .map((entity) => {
      const tu = entity.tripUpdate!
      const tripId = tu.trip?.tripId ?? ''
      const routeId = tu.trip?.routeId ?? ''
      const directionId = tu.trip?.directionId ?? 0

      // Enrich from static data
      const tripMeta = gtfsStatic?.trips[tripId]
      const effectiveRouteId = routeId || tripMeta?.routeId || ''
      const effectiveDirectionId = directionId ?? tripMeta?.directionId ?? 0
      const routeInfo = gtfsStatic?.routes[effectiveRouteId]

      const hexcolor = routeInfo?.hexcolor ?? ''
      const color = hexToColorName(hexcolor)
      const direction = DIRECTION_MAP[effectiveDirectionId] ?? 'South'

      // Destination: prefer headsign from static data, fall back to last stop
      const headsign = tripMeta?.headsign || ''

      // Map platform-level stop_ids (e.g. "A30-1") to parent station abbrs (e.g. "NBRK")
      const stopToStation = gtfsStatic?.stopToStation
      const stopUpdates: GtfsStopUpdate[] = (tu.stopTimeUpdate || []).map((stu) => {
        const rawId = stu.stopId ?? ''
        return {
          stopId: stopToStation?.[rawId] ?? rawId,
          arrivalTime: Number(stu.arrival?.time ?? 0),
          departureTime: Number(stu.departure?.time ?? 0),
          stopSequence: stu.stopSequence ?? 0,
        }
      })

      // Destination: prefer headsign from static data, fall back to last stop's station abbr
      const lastStopId = stopUpdates.length > 0
        ? stopUpdates[stopUpdates.length - 1].stopId
        : ''
      const destination = headsign || lastStopId

      return {
        tripId,
        routeId: effectiveRouteId,
        directionId: effectiveDirectionId,
        direction,
        color,
        hexcolor,
        destination,
        stopUpdates,
      }
    })
}

export async function fetchAlerts(): Promise<string[]> {
  const response = await fetch(ALERTS_URL)
  if (!response.ok) throw new Error(`GTFS-RT alerts fetch failed: ${response.status}`)
  const buf = await response.arrayBuffer()
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buf))

  return (feed.entity || [])
    .filter((e) => e.alert)
    .map((entity) => {
      const alert = entity.alert!
      return (
        alert.headerText?.translation?.[0]?.text ??
        alert.descriptionText?.translation?.[0]?.text ??
        ''
      )
    })
    .filter(Boolean)
}
