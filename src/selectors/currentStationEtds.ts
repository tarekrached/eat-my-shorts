import { createSelector } from 'reselect'
import type { RootState, CurrentStationEtds } from '../types'

const stationETDsSelector = (state: RootState) => state.stationETDs
const settingsSelector = (state: RootState) => state.settings

export const currentStationEtdsSelector = createSelector(
  [stationETDsSelector, settingsSelector],
  (stationETDs, settings) => {
    const {
      currentBartStation,
      trainColors,
      bartMinutes,
      walkingMinutes,
    } = settings

    if (
      !stationETDs[currentBartStation] ||
      !stationETDs[currentBartStation].trains
    ) {
      return {
        loading: true,
        trains: [],
        settings,
        at: null,
      } as CurrentStationEtds
    }

    const stationData = stationETDs[currentBartStation]

    return {
      at: stationData.at,
      trains: stationData.trains
        .filter(
          (t) =>
            !trainColors || trainColors.includes(t.color as any)
        )
        .map((t) => ({
          ...t,
          etd: t.at.add(bartMinutes + walkingMinutes, 'minutes'),
        })),
      loading: stationData.isFetching,
      settings,
    } as CurrentStationEtds
  }
)
