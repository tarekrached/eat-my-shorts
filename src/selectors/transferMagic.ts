import { createSelector } from 'reselect'
import type { RootState, TrainEstimate, TrainColor, Direction } from '../types'

const stationETDsSelector = (state: RootState) => state.stationETDs

interface TrainWithStations {
  train: TrainEstimate
  stations: Array<{
    station: string
    at: any
    intMinutes: number
  }>
}

export const transferMagicSelector = createSelector(
  [stationETDsSelector],
  (stationETDs) => {
    const stations = ['12TH', '19TH', 'MCAR']
    const target = {
      colors: ['ORANGE', 'RED'] as TrainColor[],
      direction: 'North' as Direction,
    }
    const source = {
      colors: ['YELLOW'] as TrainColor[],
      direction: 'North' as Direction,
    }

    if (stations.some((s) => !stationETDs[s] || !stationETDs[s].trains)) {
      return {
        isFetching: true,
        targetTrains: [],
        sourceTrains: [],
        stations: [],
      }
    }

    const rawTrains: TrainWithStations[] = stationETDs[stations[0]].trains.map((train) => {
      const trainStations = stations.reduce((acc, station) => {
        const stationTrain = stationETDs[station].trains.find(
          (t) =>
            t.destination === train.destination &&
            t.length === train.length &&
            t.intMinutes >= train.intMinutes
        )
        return stationTrain
          ? acc.concat({
              station,
              at: stationTrain.at,
              intMinutes: stationTrain.intMinutes,
            })
          : acc
      }, [] as Array<{ station: string; at: any; intMinutes: number }>)

      return {
        train,
        stations: trainStations,
      }
    })

    const targetTrains = rawTrains.filter(
      (t) =>
        target.colors.includes(t.train.color as TrainColor) &&
        t.train.direction === target.direction
    )

    const sourceTrains = rawTrains.filter(
      (t) =>
        source.colors.includes(t.train.color as TrainColor) &&
        t.train.direction === source.direction
    )

    return {
      isFetching: false,
      targetTrains,
      sourceTrains,
      stations: stations.map((station) => ({
        station,
        targetTrains: stationETDs[station].trains.filter(
          (t) =>
            target.colors.includes(t.color as TrainColor) &&
            t.direction === target.direction
        ),
        sourceTrains: stationETDs[station].trains.filter(
          (t) =>
            source.colors.includes(t.color as TrainColor) &&
            t.direction === source.direction
        ),
      })),
    }
  }
)
