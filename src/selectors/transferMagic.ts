import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import type { RootState } from '../types'
import type { GtfsTripUpdate } from '../services/gtfs-rt'

/**
 * Transfer Magic — "which Oakland station do I get off at?"
 *
 * The trip home from SF on a Yellow (Antioch/Pittsburg) train doesn't reach a
 * Richmond-line station, so you have to change trains somewhere in the Oakland
 * wye. You get three shots at it — 12th St, 19th St, MacArthur — and the useful
 * question is not "what trains are at those stations", it's "given the train
 * I'm on right now, which of the three gets me home soonest, and can I get on
 * an emptier train by hopping off early?"
 *
 * The answer is usually that two or three of the stations catch the *same*
 * onward train, in which case the earliest station wins: same arrival time at
 * home, but you board several minutes ahead of everyone who stayed on, which
 * is the difference between a seat and a shoulder. Occasionally an earlier
 * station catches a strictly earlier train, which is worth being told about.
 *
 * Two things this deliberately does NOT do:
 *
 *  - Trust GTFS `direction_id`. BART publishes `direction_id: 0` on every
 *    single trip in the realtime feed, so a `direction === 'North'` filter
 *    matches nothing. (This is what left the view blank.)
 *  - Filter onward trains by line color. Half the Red trains through Oakland
 *    are Millbrae-bound and half the Orange trains are Berryessa-bound; the
 *    color doesn't tell you which. Instead a train counts as a connection if
 *    its remaining stop sequence actually contains your destination station.
 */

// The Oakland wye: every Antioch/Pittsburg-bound train stops at all three of
// these before diverging at MacArthur, and every Richmond-bound train passes
// through them too, so each is a genuine transfer opportunity.
const TRANSFER_STATIONS = ['12TH', '19TH', 'MCAR']

// Slack between stepping off one train and the other's doors closing. These
// are same-platform or cross-platform changes, so this is doors-and-stairs
// time rather than a real walk.
const TRANSFER_BUFFER_SECONDS = 60

// A train whose stop at your station is this far in the past is gone.
const DEPARTED_GRACE_SECONDS = 60

export interface TransferTrain {
  tripId: string
  color: string
  hexcolor: string
  destination: string
  at: dayjs.Dayjs
  intMinutes: number
}

export interface TransferOption {
  station: string
  stationName: string
  /** false when your train has already passed this station (or never served it) */
  reachable: boolean
  youArriveAt: dayjs.Dayjs | null
  minutesUntilArrival: number
  /** the first onward train you can realistically make here */
  connection: TransferTrain | null
  waitMinutes: number
  arriveAt: dayjs.Dayjs | null
  /** arrival plus the walk at the far end, matching the main view's ETD */
  homeAt: dayjs.Dayjs | null
  /** the station to actually get off at */
  recommended: boolean
  /** this option catches the same onward train as the recommended one */
  sameTrainAsRecommended: boolean
}

export interface TransferRide {
  tripId: string
  color: string
  hexcolor: string
  destination: string
  /** when this train reaches the first Oakland station it still has ahead of it */
  reachesOaklandAt: dayjs.Dayjs
  options: TransferOption[]
  recommendedStation: string | null
  /** true when the recommendation only wins on boarding early, not on arrival */
  beatsTheRush: boolean
  /** minutes saved over the best station that catches a different train */
  savesMinutes: number
  /** the station those saved minutes are measured against */
  savesAgainst: string | null
}

export interface TransferMagic {
  loading: boolean
  fetchedAt: dayjs.Dayjs | null
  destination: string
  destinationName: string
  /** trains you could plausibly be on right now, soonest to reach Oakland first */
  rides: TransferRide[]
  /** set when the current trip needs no transfer at all */
  noTransferNeeded: boolean
}

const gtfsRtSelector = (state: RootState) => state.gtfsRt
const settingsSelector = (state: RootState) => state.settings

const stopIndex = (tu: GtfsTripUpdate, station: string): number =>
  tu.stopUpdates.findIndex((s) => s.stopId === station)

/**
 * BART omits one side of the pair at termini and occasionally mid-route, so
 * fall back to whichever timestamp is present.
 */
const arrivalAt = (tu: GtfsTripUpdate, station: string): number | null => {
  const stop = tu.stopUpdates[stopIndex(tu, station)]
  if (!stop) return null
  return stop.arrivalTime || stop.departureTime || null
}

const departureAt = (tu: GtfsTripUpdate, station: string): number | null => {
  const stop = tu.stopUpdates[stopIndex(tu, station)]
  if (!stop) return null
  return stop.departureTime || stop.arrivalTime || null
}

export const transferMagicSelector = createSelector(
  [gtfsRtSelector, settingsSelector],
  (gtfsRt, settings): TransferMagic => {
    const stationNames = gtfsRt.gtfsStatic?.stationNames ?? {}
    const nameOf = (abbr: string) => stationNames[abbr] || abbr

    // Where this leg of the trip ends: the opposite end of the active preset.
    const destination =
      settings.activePresetIndex === 0 ? settings.workStation : settings.homeStation
    const destWalkingMinutes =
      settings.activePresetIndex === 0
        ? settings.workWalkingMinutes
        : settings.homeWalkingMinutes

    const empty: TransferMagic = {
      loading: gtfsRt.isFetching,
      fetchedAt: gtfsRt.fetchedAt,
      destination,
      destinationName: nameOf(destination),
      rides: [],
      noTransferNeeded: false,
    }

    if (!gtfsRt.fetchedAt || gtfsRt.tripUpdates.length === 0) return empty

    const now = dayjs()
    const nowUnix = now.unix()
    const toTrain = (tu: GtfsTripUpdate, unix: number): TransferTrain => ({
      tripId: tu.tripId,
      color: tu.color,
      hexcolor: tu.hexcolor,
      destination: nameOf(tu.stopUpdates[tu.stopUpdates.length - 1]?.stopId) || tu.destination,
      at: dayjs.unix(unix),
      intMinutes: Math.round((unix - nowUnix) / 60),
    })

    // Onward trains per transfer station: any trip that stops here and reaches
    // the destination *later in its own stop sequence*. That single test
    // handles direction and line branching at once.
    const connectionsAt = (station: string) =>
      gtfsRt.tripUpdates
        .filter((tu) => {
          const here = stopIndex(tu, station)
          const there = stopIndex(tu, destination)
          return here !== -1 && there !== -1 && there > here
        })
        .map((tu) => ({
          tu,
          departs: departureAt(tu, station) ?? 0,
          arrives: arrivalAt(tu, destination) ?? 0,
        }))
        .filter((c) => c.departs > nowUnix - DEPARTED_GRACE_SECONDS && c.arrives > 0)
        .sort((a, b) => a.departs - b.departs)

    const connectionsByStation = Object.fromEntries(
      TRANSFER_STATIONS.map((station) => [station, connectionsAt(station)])
    )

    // Trains you could be on: heading into the Oakland wye with at least one
    // transfer station still ahead, and not reaching the destination on their
    // own (if they did, you'd have no reason to change trains).
    const rides: TransferRide[] = gtfsRt.tripUpdates
      .filter((tu) => stopIndex(tu, destination) === -1)
      .map((tu) => {
        const upcoming = TRANSFER_STATIONS.map((station) => ({
          station,
          at: arrivalAt(tu, station),
        })).filter((s): s is { station: string; at: number } => s.at !== null)
        return { tu, upcoming }
      })
      .filter(({ upcoming }) => upcoming.some((s) => s.at > nowUnix))
      // Serving the wye in 12th → 19th → MacArthur order is what makes it an
      // inbound trip; the reverse order is a train heading out to SF.
      .filter(({ tu }) => {
        const order = TRANSFER_STATIONS.map((s) => stopIndex(tu, s)).filter((i) => i !== -1)
        return order.length >= 2 && order.every((v, i) => i === 0 || order[i - 1] < v)
      })
      .map(({ tu, upcoming }) => {
        const reachesOakland = Math.min(...upcoming.filter((s) => s.at > nowUnix).map((s) => s.at))

        const options: TransferOption[] = TRANSFER_STATIONS.map((station) => {
          const youArrive = arrivalAt(tu, station)
          const reachable = youArrive !== null && youArrive > nowUnix
          const connection = reachable
            ? connectionsByStation[station].find(
                (c) => c.departs >= youArrive! + TRANSFER_BUFFER_SECONDS
              ) ?? null
            : null

          return {
            station,
            stationName: nameOf(station),
            reachable,
            youArriveAt: youArrive ? dayjs.unix(youArrive) : null,
            minutesUntilArrival: youArrive ? Math.round((youArrive - nowUnix) / 60) : 0,
            connection: connection ? toTrain(connection.tu, connection.departs) : null,
            waitMinutes:
              connection && youArrive
                ? Math.round((connection.departs - youArrive) / 60)
                : 0,
            arriveAt: connection ? dayjs.unix(connection.arrives) : null,
            homeAt: connection
              ? dayjs.unix(connection.arrives).add(destWalkingMinutes, 'minute')
              : null,
            recommended: false,
            sameTrainAsRecommended: false,
          }
        })

        // Get home soonest; among stations that catch that same train, get off
        // at the first one — same arrival, but you board an emptier train.
        const usable = options.filter((o) => o.connection && o.arriveAt)
        const soonestArrival = usable.length
          ? Math.min(...usable.map((o) => o.arriveAt!.unix()))
          : null
        const winners = usable.filter((o) => o.arriveAt!.unix() === soonestArrival)
        const pick = winners[0] ?? null

        if (pick) {
          pick.recommended = true
          for (const option of usable) {
            option.sameTrainAsRecommended =
              option !== pick && option.connection!.tripId === pick.connection!.tripId
          }
        }

        // What you'd give up by riding past the recommended stop and catching
        // whatever comes next instead.
        const alternatives = usable.filter(
          (o) => o !== pick && !o.sameTrainAsRecommended
        )
        // On a tie, name the nearer station — it's the one you'd actually use.
        const nextBest = alternatives.length
          ? alternatives.reduce((a, b) => (b.arriveAt!.isBefore(a.arriveAt!) ? b : a))
          : null

        return {
          tripId: tu.tripId,
          color: tu.color,
          hexcolor: tu.hexcolor,
          destination: tu.destination,
          reachesOaklandAt: dayjs.unix(reachesOakland),
          options,
          recommendedStation: pick?.station ?? null,
          beatsTheRush: usable.some((o) => o.sameTrainAsRecommended),
          savesMinutes:
            pick && nextBest
              ? Math.round(nextBest.arriveAt!.diff(pick.arriveAt!, 'second') / 60)
              : 0,
          savesAgainst: nextBest?.stationName ?? null,
        }
      })
      .sort((a, b) => a.reachesOaklandAt.diff(b.reachesOaklandAt))

    return {
      ...empty,
      loading: false,
      rides,
      noTransferNeeded:
        rides.length === 0 &&
        gtfsRt.tripUpdates.some((tu) => stopIndex(tu, destination) !== -1),
    }
  }
)
