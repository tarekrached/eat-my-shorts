import type { Dayjs } from 'dayjs'
import type { TrainEstimate, UserPosition } from './bart-api'

export type Direction = 'North' | 'South'
export type Preset = 'home2Work' | 'work2Home'
export type TrainColor = 'RED' | 'YELLOW' | 'BLUE' | 'GREEN' | 'ORANGE'

export interface Settings {
  preset: Preset
  currentBartStation: string
  bartDestination?: string
  bartMinutes: number
  bartDirection: Direction
  walkingMinutes: number
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
