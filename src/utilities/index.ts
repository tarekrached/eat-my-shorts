import type { TripPreset, Settings } from '../types'

export const bartApiKey = 'MW9S-E7SL-26DU-VV8V&'
export const bartApiRoot = window.location.protocol + '//api.bart.gov/api/'

export const bartStationETDsUrl = (station: string, dir: string | null = null): string =>
  `${bartApiRoot}etd.aspx?cmd=etd&orig=${station}${
    dir ? '&dir=' + dir[0].toLowerCase() : ''
  }&key=${bartApiKey}&json=y`

export const bartAdvisoriesUrl = `${bartApiRoot}bsa.aspx?cmd=bsa&key=${bartApiKey}&json=y`

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
