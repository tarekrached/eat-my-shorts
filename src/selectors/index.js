import { createSelector } from "reselect"

const stationETDsSelector = state => state.stationETDs
const settingsSelector = state => state.settings

export const currentStationEtdsSelector = createSelector(
  stationETDsSelector,
  settingsSelector,
  (
    stationETDs,
    { currentBartStation, bartDirection, trainColors, walkingMinutes }
  ) => {
    if (
      !stationETDs[currentBartStation] ||
      !stationETDs[currentBartStation].trains
    ) {
      return { isFetching: true }
    }
    return {
      at: stationETDs[currentBartStation].at,
      trains: stationETDs[currentBartStation].trains
        .filter(
          t =>
            t.direction === bartDirection &&
            (!trainColors || trainColors.includes(t.color))
        )
        .map(t =>
          Object.assign({}, t, {
            etd: t.at.clone().add(walkingMinutes, "minutes"),
          })
        ),
      isFetching: stationETDs[currentBartStation].isFetching,
    }
  }
)

export const transferMagicSelector = createSelector(
  stationETDsSelector,
  stationETDs => {
    const stations = ["19TH", "12TH", "MCAR"]
    const targetDests = ["RICH"]
    // const transferDests = ["PITT", "NCON"]
    const sourceColors = ["YELLOW"]
    const sourceDirection = "North"

    if (stations.some(s => !stationETDs[s] || !stationETDs[s].trains)) {
      return { isFetching: true }
    }

    return stations.reduce(
      (acc, station) =>
        Object.assign(acc, {
          [station]: {
            targetTrains: stationETDs[station].trains.filter(t =>
              targetDests.includes(t.abbreviation)
            ),
            sourceTrains: stationETDs[station].trains.filter(
              t =>
                sourceColors.includes(t.color) &&
                t.direction === sourceDirection
            ),
          },
        }),
      {}
    )
  }
)
