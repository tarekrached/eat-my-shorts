import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import type { RootState } from '../types'
import type { GtfsTripUpdate } from '../services/gtfs-rt'
import { inferDirection } from '../utilities'

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

// The physical floor: stepping off one train and onto another that's already
// standing there. These are same-platform or cross-platform changes, so this is
// doors-and-stairs time rather than a real walk. Anything below this is not a
// connection at all.
const DOORS_SECONDS = 60

/**
 * Above the floor there's a second, softer threshold: the shortest connection
 * you'd actually bet on (settings.minTransferMinutes, default 3).
 *
 * This matters more than it sounds. BART's August 2026 schedule stopped holding
 * Antioch-bound Yellow trains at 19th St for the Orange, so in the evening the
 * Orange connection there is scheduled at one minute — you arrive as it leaves.
 * Ranking purely by arrival time would recommend that one-minute dash over a
 * Red train at 12th you'd comfortably make, i.e. confidently recommend the
 * option that fails. So connections split in two: ones you can plan on, which
 * drive the recommendation, and sprints, which are offered as an upside.
 */

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

/** A connection you could make here, with what it costs and what it gets you. */
export interface TransferConnection {
  train: TransferTrain
  waitMinutes: number
  arriveAt: dayjs.Dayjs
  /** arrival plus the walk at the far end, matching the main view's ETD */
  homeAt: dayjs.Dayjs
}

export interface TransferOption {
  station: string
  stationName: string
  /** false when your train has already passed this station (or never served it) */
  reachable: boolean
  youArriveAt: dayjs.Dayjs | null
  minutesUntilArrival: number
  /** the first onward train you'd bet on making here */
  connection: TransferTrain | null
  waitMinutes: number
  arriveAt: dayjs.Dayjs | null
  homeAt: dayjs.Dayjs | null
  /**
   * An earlier train you could only catch by running, i.e. one scheduled
   * inside minTransferMinutes of your arrival. Null when there isn't one, or
   * when the train you'd bet on is already the first one through.
   */
  sprint: TransferConnection | null
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
  /**
   * True when this train has already left the station you're travelling from,
   * so it's one you could actually be sitting on. BART drops stops from a trip
   * once it has passed them, so a trip that still lists your origin is one that
   * hasn't collected you yet.
   */
  alreadyLeftOrigin: boolean
  /** the station offering the best sprint, when a sprint beats the plan */
  sprintStation: string | null
  sprintStationName: string | null
  /** minutes the sprint would save over the recommended connection */
  sprintSavesMinutes: number
  sprintWaitMinutes: number
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
    const plannableSeconds = Math.max(
      DOORS_SECONDS,
      (settings.minTransferMinutes ?? 3) * 60
    )
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

    // Trains you could be on: heading your way through the Oakland wye with at
    // least one transfer station still ahead, and not reaching the destination
    // on their own (if they did, you'd have no reason to change trains).
    //
    // Note that one wye station left is the case that matters most — you're
    // past 19th, MacArthur is the last chance — so this must not require two.
    // BART's feed drops stops once a train has passed them, which is why an
    // "is it in 12th → 19th → MacArthur order" test can't stand in for
    // direction here: by the time it matters there's only one stop left to
    // order. Direction comes from the adjacent stop instead, the same way
    // currentStationEtdsSelector does it, which also makes this work in the
    // southbound (home → work) direction rather than silently assuming you're
    // heading north.
    const headingOurWay = (tu: GtfsTripUpdate, station: string): boolean => {
      const idx = stopIndex(tu, station)
      if (idx === -1) return false
      const next = tu.stopUpdates[idx + 1]?.stopId
      if (next) return inferDirection(station, next) === settings.bartDirection
      // Last stop in a truncated trip: infer from where it came from instead.
      const prev = tu.stopUpdates[idx - 1]?.stopId
      if (prev) return inferDirection(prev, station) === settings.bartDirection
      return false
    }

    const rides: TransferRide[] = gtfsRt.tripUpdates
      .filter((tu) => stopIndex(tu, destination) === -1)
      .map((tu) => {
        const upcoming = TRANSFER_STATIONS.map((station) => ({
          station,
          at: arrivalAt(tu, station),
        })).filter((s): s is { station: string; at: number } => s.at !== null)
        return { tu, upcoming }
      })
      .filter(({ tu, upcoming }) => {
        const ahead = upcoming.filter((s) => s.at > nowUnix)
        return ahead.length > 0 && headingOurWay(tu, ahead[0].station)
      })
      .map(({ tu, upcoming }) => {
        const reachesOakland = Math.min(...upcoming.filter((s) => s.at > nowUnix).map((s) => s.at))

        // Listed in the order this train reaches them, so the view reads like
        // the ride does. Stations already passed sort to the end.
        const options: TransferOption[] = TRANSFER_STATIONS.map((station) => {
          const youArrive = arrivalAt(tu, station)
          const reachable = youArrive !== null && youArrive > nowUnix
          const candidates = reachable ? connectionsByStation[station] : []

          // The one you'd plan on, and the earlier one you'd have to run for.
          const connection =
            candidates.find((c) => c.departs >= youArrive! + plannableSeconds) ?? null
          const sprintCandidate =
            candidates.find((c) => c.departs >= youArrive! + DOORS_SECONDS) ?? null
          const sprint =
            sprintCandidate && sprintCandidate !== connection
              ? {
                  train: toTrain(sprintCandidate.tu, sprintCandidate.departs),
                  waitMinutes: Math.round((sprintCandidate.departs - youArrive!) / 60),
                  arriveAt: dayjs.unix(sprintCandidate.arrives),
                  homeAt: dayjs
                    .unix(sprintCandidate.arrives)
                    .add(destWalkingMinutes, 'minute'),
                }
              : null

          return {
            sprint,
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
        }).sort((a, b) => {
          if (!a.youArriveAt) return b.youArriveAt ? 1 : 0
          if (!b.youArriveAt) return -1
          return a.youArriveAt.unix() - b.youArriveAt.unix()
        })

        // Get home soonest; among stations that catch that same train, get off
        // at the first one — same arrival, but you board an emptier train.
        //
        // "First" means the one you reach first on this train, which is not the
        // order TRANSFER_STATIONS is written in: northbound you meet 12th then
        // 19th then MacArthur, southbound the reverse. Ordering by your own
        // arrival gets it right in both directions.
        const usable = options.filter((o) => o.connection && o.arriveAt)
        const soonestArrival = usable.length
          ? Math.min(...usable.map((o) => o.arriveAt!.unix()))
          : null
        const winners = usable
          .filter((o) => o.arriveAt!.unix() === soonestArrival)
          .sort((a, b) => a.youArriveAt!.unix() - b.youArriveAt!.unix())
        const pick = winners[0] ?? null

        if (pick) {
          pick.recommended = true
          for (const option of usable) {
            option.sameTrainAsRecommended =
              option !== pick && option.connection!.tripId === pick.connection!.tripId
          }
        }

        // The best sprint worth mentioning: one that actually beats the plan.
        // If it doesn't get you home sooner there's no reason to run for it.
        const sprints = options
          .filter((o) => o.sprint)
          .filter((o) => !pick || o.sprint!.arriveAt.isBefore(pick.arriveAt!))
          .sort((a, b) => a.sprint!.arriveAt.unix() - b.sprint!.arriveAt.unix())
        const topSprint = sprints[0] ?? null
        const bestSprint = {
          sprintStation: topSprint?.station ?? null,
          sprintStationName: topSprint?.stationName ?? null,
          sprintWaitMinutes: topSprint?.sprint!.waitMinutes ?? 0,
          sprintSavesMinutes:
            topSprint && pick
              ? Math.round(
                  pick.arriveAt!.diff(topSprint.sprint!.arriveAt, 'second') / 60
                )
              : 0,
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
          alreadyLeftOrigin: stopIndex(tu, settings.currentBartStation) === -1,
          ...bestSprint,
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
