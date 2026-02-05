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
      homeWalkingMinutes,
      workWalkingMinutes,
      preset,
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
    const isHome2Work = preset === 'home2Work'
    const originWalking = isHome2Work ? homeWalkingMinutes : workWalkingMinutes
    const destWalking = isHome2Work ? workWalkingMinutes : homeWalkingMinutes

    return {
      at: stationData.at,
      trains: stationData.trains
        .filter(
          (t) =>
            !trainColors || trainColors.includes(t.color as any)
        )
        .map((t) => ({
          ...t,
          leaveBy: t.at.subtract(originWalking, 'minutes'),
          etd: t.at.add(bartMinutes + destWalking, 'minutes'),
        })),
      loading: stationData.isFetching,
      settings,
    } as CurrentStationEtds
  }
)
