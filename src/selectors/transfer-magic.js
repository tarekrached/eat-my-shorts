import { createSelector } from "reselect"

const stationETDsSelector = state => state.stationETDs

export const transferMagicSelector = createSelector(
  stationETDsSelector,
  (stationETDs, settings) => {
    const stations = ["12TH", "19TH", "MCAR"]
    const target = {
      colors: ["ORANGE", "RED"],
      direction: "North",
    }
    const source = {
      colors: ["YELLOW"],
      direction: "North",
    }

    if (stations.some(s => !stationETDs[s] || !stationETDs[s].trains)) {
      return { isFetching: true }
    }

    const rawTrains = stationETDs[stations[0]].trains.map(train => {
      let trainStations = stations.reduce((acc, station) => {
        const stationTrain = stationETDs[station].trains.find(
          t =>
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
      }, [])

      return {
        train,
        stations: trainStations,
      }
    })

    const targetTrains = rawTrains.filter(
      t =>
        target.colors.includes(t.train.color) &&
        t.train.direction === target.direction
    )

    const sourceTrains = rawTrains.filter(
      t =>
        source.colors.includes(t.train.color) &&
        t.train.direction === source.direction
    )

    return {
      isFetching: false,
      targetTrains,
      sourceTrains,
      stations: stations.map(station => ({
        station,
        targetTrains: stationETDs[station].trains.filter(
          t =>
            target.colors.includes(t.color) && t.direction === target.direction
        ),
        sourceTrains: stationETDs[station].trains.filter(
          t =>
            source.colors.includes(t.color) && t.direction === source.direction
        ),
      })),
    }
  }
)
