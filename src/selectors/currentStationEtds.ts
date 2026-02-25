import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import type { RootState, CurrentStationEtds, EnrichedTrain, TrainColor, Direction } from '../types'
import { inferDirection } from '../utilities'

const gtfsRtSelector = (state: RootState) => state.gtfsRt
const settingsSelector = (state: RootState) => state.settings

/**
 * Determine the geographic direction a train is heading at a specific station
 * by looking at the next stop in the trip's stop sequence.
 */
function directionAtStation(
  stopUpdates: Array<{ stopId: string }>,
  station: string
): Direction | null {
  const idx = stopUpdates.findIndex((s) => s.stopId === station)
  if (idx === -1) return null
  const nextStop = stopUpdates[idx + 1]?.stopId
  if (!nextStop) return null
  return inferDirection(station, nextStop)
}

export const currentStationEtdsSelector = createSelector(
  [gtfsRtSelector, settingsSelector],
  (gtfsRt, settings) => {
    const {
      currentBartStation,
      bartDirection,
      trainColors,
      bartMinutes,
      homeWalkingMinutes,
      workWalkingMinutes,
      activePresetIndex,
    } = settings

    if (!gtfsRt.fetchedAt || gtfsRt.tripUpdates.length === 0) {
      return {
        loading: gtfsRt.isFetching,
        trains: [],
        settings,
        at: gtfsRt.fetchedAt,
      } as CurrentStationEtds
    }

    const isHome2Work = activePresetIndex === 0
    const originWalking = isHome2Work ? homeWalkingMinutes : workWalkingMinutes
    const destWalking = isHome2Work ? workWalkingMinutes : homeWalkingMinutes
    const now = dayjs()

    const trains: EnrichedTrain[] = gtfsRt.tripUpdates
      .filter((tu) => {
        // Trip must serve this station
        const hasStop = tu.stopUpdates.some((s) => s.stopId === currentBartStation)
        if (!hasStop) return false
        // Determine direction from stop sequence (not GTFS direction_id)
        const dir = directionAtStation(tu.stopUpdates, currentBartStation)
        if (dir !== bartDirection) return false
        // Color filter
        if (trainColors && !trainColors.includes(tu.color as TrainColor)) return false
        return true
      })
      .map((tu) => {
        const stopUpdate = tu.stopUpdates.find((s) => s.stopId === currentBartStation)!
        const departureTime = dayjs.unix(stopUpdate.departureTime)
        const secondsUntilDeparture = departureTime.diff(now, 'second')
        const intMinutes = Math.max(0, Math.floor(secondsUntilDeparture / 60))

        // Use the last stop's station name as the destination (cleaner than GTFS headsign)
        const stationNames = gtfsRt.gtfsStatic?.stationNames ?? {}
        const lastStopAbbr = tu.stopUpdates[tu.stopUpdates.length - 1]?.stopId
        const destination = stationNames[lastStopAbbr] || tu.destination

        return {
          tripId: tu.tripId,
          routeId: tu.routeId,
          color: tu.color,
          hexcolor: tu.hexcolor,
          destination,
          direction: bartDirection,
          at: departureTime,
          intMinutes,
          secondsUntilDeparture,
          leaveBy: departureTime.subtract(originWalking, 'minutes'),
          etd: departureTime.add(bartMinutes + destWalking, 'minutes'),
        }
      })
      .filter((t) => t.secondsUntilDeparture > -60) // hide trains that left > 1 min ago
      .sort((a, b) => a.at.diff(b.at))

    return {
      loading: gtfsRt.isFetching,
      trains,
      settings,
      at: gtfsRt.fetchedAt,
    } as CurrentStationEtds
  }
)
