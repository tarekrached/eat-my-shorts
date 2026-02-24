import type { Dayjs } from 'dayjs'
import type { TrainEstimate, UserPosition } from './bart-api'

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
  // Active/flattened fields (copied from selected preset; read by existing selectors)
  currentBartStation: string
  bartDirection: Direction
  bartMinutes: number
  trainColors?: TrainColor[]
}

export interface StationETDsState {
  [stationAbbr: string]: {
    isFetching: boolean
    trains: TrainEstimate[]
    at: Dayjs
    error?: string
  }
}

export interface BartAdvisoriesState {
  isFetching: boolean
  bartAdvisories: string[]
  error: string | false
}

export interface UserLocationState {
  isFetching: boolean
  position: UserPosition | null
  error: string | false
}

export interface RootState {
  settings: Settings
  stationETDs: StationETDsState
  bartAdvisories: BartAdvisoriesState
  userLocation: UserLocationState
}

export interface CurrentStationEtds {
  loading: boolean
  trains: TrainEstimate[]
  settings: Settings
  at: Dayjs | null
}
