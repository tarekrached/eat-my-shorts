import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import type { RootState, TrainColor, Direction } from '../types'

interface StationTrainInfo {
  station: string
  at: dayjs.Dayjs
  intMinutes: number
}

interface TrainWithStations {
  train: {
    destination: string
    hexcolor: string
    color: string
    direction: Direction
    intMinutes: number
  }
  stations: StationTrainInfo[]
}

const gtfsRtSelector = (state: RootState) => state.gtfsRt

export const transferMagicSelector = createSelector(
  [gtfsRtSelector],
  (gtfsRt) => {
    const stations = ['12TH', '19TH', 'MCAR']
    const target = {
      colors: ['ORANGE', 'RED'] as TrainColor[],
      direction: 'North' as Direction,
    }
    const source = {
      colors: ['YELLOW'] as TrainColor[],
      direction: 'North' as Direction,
    }

    if (!gtfsRt.fetchedAt || gtfsRt.tripUpdates.length === 0) {
      return {
        isFetching: gtfsRt.isFetching,
        targetTrains: [],
        sourceTrains: [],
        stations: [],
      }
    }

    const now = dayjs()

    // For each trip, compute departure info at each of the Oakland stations
    const tripsAtStations = gtfsRt.tripUpdates
      .filter((tu) =>
        tu.stopUpdates.some((s) => stations.includes(s.stopId))
      )
      .map((tu) => {
        const stationInfos = stations
          .map((station) => {
            const stop = tu.stopUpdates.find((s) => s.stopId === station)
            if (!stop) return null
            const departureTime = dayjs.unix(stop.departureTime)
            return {
              station,
              at: departureTime,
              intMinutes: Math.max(0, departureTime.diff(now, 'minute')),
            }
          })
          .filter(Boolean) as StationTrainInfo[]

        const firstStop = stationInfos[0]
        return {
          train: {
            destination: tu.destination,
            hexcolor: tu.hexcolor,
            color: tu.color,
            direction: tu.direction,
            intMinutes: firstStop?.intMinutes ?? 0,
          },
          stations: stationInfos,
        } as TrainWithStations
      })

    const targetTrains = tripsAtStations.filter(
      (t) =>
        target.colors.includes(t.train.color as TrainColor) &&
        t.train.direction === target.direction
    )

    const sourceTrains = tripsAtStations.filter(
      (t) =>
        source.colors.includes(t.train.color as TrainColor) &&
        t.train.direction === source.direction
    )

    // Per-station breakdown for the station view
    const perStation = stations.map((station) => {
      const stationTargets = gtfsRt.tripUpdates
        .filter(
          (tu) =>
            target.colors.includes(tu.color as TrainColor) &&
            tu.direction === target.direction &&
            tu.stopUpdates.some((s) => s.stopId === station)
        )
        .map((tu) => {
          const stop = tu.stopUpdates.find((s) => s.stopId === station)!
          return {
            ...tu,
            intMinutes: Math.max(
              0,
              dayjs.unix(stop.departureTime).diff(now, 'minute')
            ),
          }
        })

      const stationSources = gtfsRt.tripUpdates
        .filter(
          (tu) =>
            source.colors.includes(tu.color as TrainColor) &&
            tu.direction === source.direction &&
            tu.stopUpdates.some((s) => s.stopId === station)
        )
        .map((tu) => {
          const stop = tu.stopUpdates.find((s) => s.stopId === station)!
          return {
            ...tu,
            intMinutes: Math.max(
              0,
              dayjs.unix(stop.departureTime).diff(now, 'minute')
            ),
          }
        })

      return {
        station,
        targetTrains: stationTargets,
        sourceTrains: stationSources,
      }
    })

    return {
      isFetching: false,
      targetTrains,
      sourceTrains,
      stations: perStation,
    }
  }
)
