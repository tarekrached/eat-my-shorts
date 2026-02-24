import type { TripPreset, Settings, Direction } from '../types'
import bartRoutes from '../data/bart-routes.json'

export const bartApiKey = 'MW9S-E7SL-26DU-VV8V&'
export const bartApiRoot = window.location.protocol + '//api.bart.gov/api/'

export const bartStationETDsUrl = (station: string, dir: string | null = null): string =>
  `${bartApiRoot}etd.aspx?cmd=etd&orig=${station}${
    dir ? '&dir=' + dir[0].toLowerCase() : ''
  }&key=${bartApiKey}&json=y`

export const bartAdvisoriesUrl = `${bartApiRoot}bsa.aspx?cmd=bsa&key=${bartApiKey}&json=y`

export const bartScheduleUrl = (orig: string, dest: string): string =>
  `${bartApiRoot}sched.aspx?cmd=depart&orig=${orig}&dest=${dest}&date=now&key=${bartApiKey}&json=y`

// Infer the BART direction (North/South) needed at `from` to reach `to`,
// using the bundled route data. Returns null if no direct route connects them.
export const inferDirection = (from: string, to: string): Direction | null => {
  for (const route of bartRoutes) {
    const stations = route.config.station as string[]
    const fromIdx = stations.indexOf(from)
    const toIdx = stations.indexOf(to)
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
      return route.direction as Direction
    }
  }
  return null
}

// Fetch the scheduled travel time in minutes between two stations via the BART API.
export const fetchTravelMinutes = async (orig: string, dest: string): Promise<number> => {
  const res = await fetch(bartScheduleUrl(orig, dest))
  if (!res.ok) throw new Error(`BART schedule API error: ${res.status}`)
  const data = await res.json()
  const tripRaw = data?.root?.schedule?.request?.trip
  const trip = Array.isArray(tripRaw) ? tripRaw[0] : tripRaw
  const minutes = parseInt(trip?.['@tripTime'])
  if (isNaN(minutes)) throw new Error('Could not parse trip time from BART API')
  return minutes
}

export const checkFetchStatus = (response: Response): Response => {
  if (response.status >= 200 && response.status < 300) {
    return response
  }
  const error = new Error(response.statusText) as Error & { response?: Response }
  error.response = response
  throw error
}

export const radians = (n: number): number => n * (Math.PI / 180)

export const degrees = (n: number): number => n * (180 / Math.PI)

export const getBearing = (
  [startLong, startLat]: [number, number],
  [endLong, endLat]: [number, number]
): number => {
  const startLatRad = radians(startLat)
  const startLongRad = radians(startLong)
  const endLatRad = radians(endLat)
  const endLongRad = radians(endLong)

  let dLong = endLongRad - startLongRad

  const dPhi = Math.log(
    Math.tan(endLatRad / 2.0 + Math.PI / 4.0) /
      Math.tan(startLatRad / 2.0 + Math.PI / 4.0)
  )

  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0) {
      dLong = -(2.0 * Math.PI - dLong)
    } else {
      dLong = 2.0 * Math.PI + dLong
    }
  }

  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0
}

export const defaultPresets: [TripPreset, TripPreset] = [
  {
    name: 'home → work',
    currentBartStation: 'NBRK',
    bartMinutes: 25,
    bartDirection: 'South',
  },
  {
    name: 'work → home',
    currentBartStation: 'MONT',
    bartMinutes: 25,
    bartDirection: 'North',
    trainColors: ['RED', 'YELLOW'],
  },
]

export const buildInitialSettings = (
  presets: [TripPreset, TripPreset],
  autoSwitch: boolean,
  autoSwitchHour: number,
  homeWalkingMinutes: number,
  workWalkingMinutes: number,
): Omit<Settings, 'homeStation' | 'workStation'> => {
  const index: 0 | 1 =
    autoSwitch && new Date().getHours() < autoSwitchHour ? 0 : autoSwitch ? 1 : 0
  const active = presets[index]
  return {
    activePresetIndex: index,
    presets,
    autoSwitch,
    autoSwitchHour,
    homeWalkingMinutes,
    workWalkingMinutes,
    currentBartStation: active.currentBartStation,
    bartDirection: active.bartDirection,
    bartMinutes: active.bartMinutes,
    trainColors: active.trainColors,
  }
}
