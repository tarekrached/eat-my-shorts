import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import type { RootState, EnrichedTrain } from '../types'
import { currentStationEtdsSelector } from './currentStationEtds'
import { transferMagicSelector } from './transferMagic'

/**
 * Inline preview — EXPERIMENTAL, lives at /inline alongside the real views.
 *
 * The idea under test: put the transfer verdict on the departure list instead
 * of on its own page, so you never navigate. The main view currently estimates
 * arrival as `departure + settings.bartMinutes + walk`, which is a fixed number
 * from settings and is simply wrong for any train that doesn't reach your
 * destination — it promises you'll be home at a time no Yellow train can
 * deliver. Here every arrival time is read out of the trip's own stop sequence
 * instead: directly for through trains, and via the recommended Oakland
 * transfer for the ones that need one.
 *
 * The open question is whether the transfer arrival is stable enough to act on
 * while you're standing at Montgomery, twenty-odd minutes upstream of the
 * transfer itself. The view is instrumented for that (see InlinePreview.tsx);
 * this selector just produces the numbers.
 */

export interface InlineRow {
  train: EnrichedTrain
  /** null when the train reaches the destination without changing */
  transferStation: string | null
  transferStationName: string | null
  waitMinutes: number
  connectionHexcolor: string | null
  /** an earlier train at this station that you'd have to run for */
  sprintWaitMinutes: number
  sprintHomeAt: dayjs.Dayjs | null
  /** arrival at the destination station, from real stop times */
  arriveAt: dayjs.Dayjs | null
  /** arrival plus the walk at the far end */
  homeAt: dayjs.Dayjs | null
  /**
   * Why there's no arrival time. 'no-route' means this train can't get you
   * there at all (Blue and Green never touch the Oakland wye); 'no-connection'
   * means the transfer exists but no onward train is published that far ahead,
   * which is a wait-and-see rather than a dead end.
   */
  unresolved: null | 'no-route' | 'no-connection'
}

/**
 * Whether a row's arrival time depends on a connecting train, and is therefore
 * worth watching for drift. A through train's arrival is read straight off its
 * own stop times with no second train involved, so there's nothing there to
 * move; likewise a train with no route home at all. Only a transfer, or an
 * expected transfer whose onward train hasn't been published yet, can flap.
 */
export const dependsOnConnection = (row: InlineRow): boolean =>
  row.transferStation !== null || row.unresolved === 'no-connection'

export interface InlinePreview {
  loading: boolean
  fetchedAt: dayjs.Dayjs | null
  destination: string
  destinationName: string
  rows: InlineRow[]
}

// GTFS station names are far too long to sit next to a destination headsign on
// a phone ("12th Street / Oakland City Center"), and these three are the only
// ones this view ever names.
const SHORT_NAMES: Record<string, string> = {
  '12TH': '12th',
  '19TH': '19th',
  MCAR: 'MacArthur',
}

const gtfsRtSelector = (state: RootState) => state.gtfsRt
const settingsSelector = (state: RootState) => state.settings

export const inlinePreviewSelector = createSelector(
  [currentStationEtdsSelector, transferMagicSelector, gtfsRtSelector, settingsSelector],
  (etds, transfer, gtfsRt, settings): InlinePreview => {
    const destWalkingMinutes =
      settings.activePresetIndex === 0
        ? settings.workWalkingMinutes
        : settings.homeWalkingMinutes

    // Rides are keyed by the trip you'd be riding, which is exactly what the
    // departure list is showing, so the join is a tripId lookup per row.
    const ridesByTripId = new Map(transfer.rides.map((ride) => [ride.tripId, ride]))
    const tripsById = new Map(gtfsRt.tripUpdates.map((tu) => [tu.tripId, tu]))

    const rows: InlineRow[] = etds.trains.map((train) => {
      const ride = ridesByTripId.get(train.tripId)

      if (ride) {
        const option = ride.options.find((o) => o.recommended)
        return {
          train,
          transferStation: option?.station ?? null,
          transferStationName: option
            ? SHORT_NAMES[option.station] ?? option.stationName
            : null,
          waitMinutes: option?.waitMinutes ?? 0,
          connectionHexcolor: option?.connection?.hexcolor ?? null,
          sprintWaitMinutes: option?.sprint?.waitMinutes ?? 0,
          sprintHomeAt: option?.sprint?.homeAt ?? null,
          arriveAt: option?.arriveAt ?? null,
          homeAt: option?.homeAt ?? null,
          unresolved: option ? null : 'no-connection',
        }
      }

      // No transfer needed: read the arrival straight off this trip's own stop
      // sequence rather than trusting the fixed bartMinutes estimate.
      const tu = tripsById.get(train.tripId)
      const stop = tu?.stopUpdates.find((s) => s.stopId === transfer.destination)
      const arrival = stop ? stop.arrivalTime || stop.departureTime : 0

      return {
        train,
        transferStation: null,
        transferStationName: null,
        waitMinutes: 0,
        connectionHexcolor: null,
        sprintWaitMinutes: 0,
        sprintHomeAt: null,
        arriveAt: arrival ? dayjs.unix(arrival) : null,
        homeAt: arrival ? dayjs.unix(arrival).add(destWalkingMinutes, 'minute') : null,
        unresolved: arrival ? null : 'no-route',
      }
    })

    return {
      loading: etds.loading,
      fetchedAt: gtfsRt.fetchedAt,
      destination: transfer.destination,
      destinationName: transfer.destinationName,
      rows,
    }
  }
)
