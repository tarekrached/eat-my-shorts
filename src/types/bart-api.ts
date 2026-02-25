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
