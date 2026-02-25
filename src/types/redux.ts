import type { Dayjs } from 'dayjs'
import type { UserPosition } from './bart-api'
import type { GtfsTripUpdate } from '../services/gtfs-rt'
import type { GtfsStaticData } from '../services/gtfs-static'

export type Direction = 'North' | 'South'
export type TrainColor = 'RED' | 'YELLOW' | 'BLUE' | 'GREEN' | 'ORANGE'

export interface TripPreset {
  name: string
  currentBartStation: string
  bartDirection: Direction
  bartMinutes: number
}

export interface Settings {
  activePresetIndex: 0 | 1
  presets: [TripPreset, TripPreset]
  autoSwitch: boolean
  autoSwitchHour: number
  homeStation: string
  workStation: string
  homeWalkingMinutes: number
  workWalkingMinutes: number
  pollingIntervalSeconds: number
  // Active/flattened fields (copied from selected preset; read by existing selectors)
  currentBartStation: string
  bartDirection: Direction
  bartMinutes: number
  trainColors?: TrainColor[]
}

export interface GtfsRtState {
  isFetching: boolean
  tripUpdates: GtfsTripUpdate[]
  alerts: string[]
  fetchedAt: Dayjs | null
  error: string | null
  gtfsStatic: GtfsStaticData | null
  gtfsStaticError: string | null
}

export interface UserLocationState {
  isFetching: boolean
  position: UserPosition | null
  error: string | false
}

export interface RootState {
  settings: Settings
  gtfsRt: GtfsRtState
  userLocation: UserLocationState
}

/** A train estimate enriched by the currentStationEtds selector */
export interface EnrichedTrain {
  tripId: string
  routeId: string
  color: string
  hexcolor: string
  destination: string
  direction: Direction
  at: Dayjs          // departure time at this stop
  intMinutes: number // minutes until departure
  leaveBy: Dayjs     // latest time to leave home/work
  etd: Dayjs         // estimated arrival at destination
  secondsUntilDeparture: number
}

export interface CurrentStationEtds {
  loading: boolean
  trains: EnrichedTrain[]
  settings: Settings
  at: Dayjs | null
}
