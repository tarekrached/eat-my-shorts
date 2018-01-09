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
