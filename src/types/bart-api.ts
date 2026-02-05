import type { Dayjs } from 'dayjs'

export interface BartStation {
  name: string
  abbr: string
  gtfs_latitude: string
  gtfs_longitude: string
  address: string
  city: string
  county: string
  state: string
  zipcode: string
}

export interface BartRoute {
  name: string
  abbr: string
  routeID: string
  number: string
  hexcolor: string
  color: string
  origin: string
  destination: string
  direction: string
  holidays: string
  num_stns: string
  config: {
    station: string[]
  }
}

export interface TrainEstimate {
  minutes: string // "Leaving" or numeric string like "5"
  intMinutes: number // 0 for "Leaving", parsed integer otherwise
  platform: string
  direction: string
  length: string
  color: string
  hexcolor: string
  bikeflag: string
  delay: string
  destination: string
  abbreviation: string
  limited: string
  at: Dayjs // Departure time
  etd?: Dayjs // Estimated time to destination (computed)
  leaveBy?: Dayjs // Time to leave current location (computed)
}

export interface StationETD {
  destination: string
  abbreviation: string
  limited: string
  estimate: Array<{
    minutes: string
    platform: string
    direction: string
    length: string
    color: string
    hexcolor: string
    bikeflag: string
    delay: string
  }>
}

export interface ETDResponse {
  root: {
    uri: {
      '#cdata-section': string
    }
    date: string
    time: string
    station: Array<{
      name: string
      abbr: string
      etd: StationETD[]
    }>
    message: string
  }
}

export interface BartAdvisory {
  station: string
  type: string
  description: {
    '#cdata-section': string
  }
  sms_text?: {
    '#cdata-section': string
  }
  posted: string
  expires: string
}

export interface BSAResponse {
  root: {
    uri: {
      '#cdata-section': string
    }
    date: string
    time: string
    bsa: BartAdvisory[]
  }
}

export interface UserPosition {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: number
}
