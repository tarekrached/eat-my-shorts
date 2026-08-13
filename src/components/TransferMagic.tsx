import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import { fetchGtfsRtData } from '../store/gtfsRtSlice'
import { transferMagicSelector } from '../selectors'
import type { RootState, AppDispatch } from '../store'
import type { TransferOption, TransferRide } from '../selectors/transferMagic'

const WYE = [
  { station: '12TH', label: '12th' },
  { station: '19TH', label: '19th' },
  { station: 'MCAR', label: 'MacArthur' },
]

/**
 * Where every train is on the other track, relative to the three stations.
 *
 * Your row is when you get to each station; the rest are when those trains
 * leave each station, which is the moment you'd need to already be standing
 * there. A dot means it's been and gone. So a row reading "· 2m 5m" is a train
 * that has cleared 12th and is at 19th right now, which is precisely the case
 * you can't see from a platform: not here, but still catchable if you stay on.
 */
function TrackView({ ride }: { ride: TransferRide }) {
  return (
    <table className="track">
      <thead>
        <tr>
          <th />
          {WYE.map(({ station, label }) => (
            <th key={station}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ride.track.map((train) => (
          <tr key={train.tripId} className={train.isYou ? 'you' : ''}>
            <th>
              <span className="color" style={{ backgroundColor: train.hexcolor }} />
              {train.isYou ? 'you' : train.destination}
            </th>
            {WYE.map(({ station }) => {
              const minutes = train.minutesTo[station]
              const catchable = train.catchableAt.includes(station)
              return (
                <td
                  key={station}
                  className={[
                    minutes === null ? 'gone' : '',
                    catchable ? 'catchable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {minutes === null ? '·' : `${minutes}m`}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Countdowns are recomputed from absolute times on every tick rather than read
// off the selector, which only recomputes when a poll lands.
const minutesFromNow = (at: dayjs.Dayjs): number =>
  Math.max(0, Math.floor(at.diff(dayjs(), 'second') / 60))

function StationRow({ option }: { option: TransferOption }) {
  const { station, stationName, reachable, connection } = option

  const className = [
    'transfer-option',
    option.recommended ? 'recommended' : '',
    !reachable || !connection ? 'missed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className="transfer-option-head">
        <a href={`https://www.bart.gov/schedules/eta/${station}`}>{stationName}</a>
        {option.recommended && <span className="badge">get off here</span>}
        {option.sameTrainAsRecommended && <span className="badge same">same train</span>}
      </div>
      {!reachable && <div className="transfer-detail">your train has passed it</div>}
      {reachable && !connection && (
        <div className="transfer-detail">no onward train in the feed</div>
      )}
      {reachable && connection && (
        <div className="transfer-detail">
          <span className="transfer-arrive">
            🚆 you arrive {minutesFromNow(option.youArriveAt!)}
            <span className="unit">m</span>
          </span>
          <span className="transfer-wait">
            ⏱ wait {option.waitMinutes}
            <span className="unit">m</span>
          </span>
          <span className="color" style={{ backgroundColor: connection.hexcolor }} />
          <span className="transfer-connection">{connection.destination}</span>
          <span className="home-time">{option.homeAt?.format('h:mm a')}</span>
        </div>
      )}
    </div>
  )
}

function TransferMagic() {
  const dispatch = useDispatch<AppDispatch>()
  // Track the chosen ride by trip, not by position: the list is re-sorted every
  // poll and trains drop off the front of it as they clear the wye, so a stored
  // index quietly comes to mean a different train than the one you picked.
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const gtfsRt = useSelector((state: RootState) => state.gtfsRt)
  const pollingInterval = useSelector(
    (state: RootState) => state.settings.pollingIntervalSeconds
  )
  const { loading, fetchedAt, destinationName, rides, noTransferNeeded } =
    useSelector(transferMagicSelector)

  const load = useCallback(() => {
    dispatch(fetchGtfsRtData())
  }, [dispatch])

  // Same contract as the main view: wait for GTFS static so stop IDs resolve to
  // station abbreviations, then poll. Without this the view would show a single
  // snapshot that silently goes stale while you're riding.
  const staticFetchedAt = gtfsRt.gtfsStatic?.fetchedAt ?? null
  useEffect(() => {
    if (!staticFetchedAt) return
    load()
    const timer = setInterval(load, pollingInterval * 1000)
    return () => clearInterval(timer)
  }, [load, pollingInterval, staticFetchedAt])

  // Tick the countdowns between polls, as the main view does.
  useEffect(() => {
    const timer = setInterval(() => setTick((c) => c + 1), 1_000)
    return () => clearInterval(timer)
  }, [])

  // Fall back to the first ride when the selected train has left the list.
  const selectedIndex = Math.max(
    0,
    rides.findIndex((r) => r.tripId === selectedTripId)
  )
  const ride = rides[selectedIndex]
  const step = (delta: number) => {
    const next = rides[selectedIndex + delta]
    if (next) setSelectedTripId(next.tripId)
  }

  return (
    <div className="transfer-magic">
      <div className="top-menu">
        <div>transfer → {destinationName}</div>
        <span>
          <Link to="/">Home</Link> <Link to="/inline">Inline</Link>
        </span>
      </div>

      {loading && !rides.length && <div className="loading">loading</div>}

      {!loading && noTransferNeeded && (
        <p className="transfer-empty">
          Trains to {destinationName} run straight through — no transfer needed.
        </p>
      )}

      {!loading && !noTransferNeeded && !rides.length && (
        <p className="transfer-empty">
          No inbound trains heading for the Oakland transfer stations right now.
        </p>
      )}

      {ride && (
        <>
          <div className="ride-picker">
            <button
              onClick={() => step(-1)}
              disabled={selectedIndex === 0}
              aria-label="earlier train"
            >
              ‹
            </button>
            <div className="ride">
              <div className="ride-label">you&rsquo;re on</div>
              <div className="ride-train">
                <span className="color" style={{ backgroundColor: ride.hexcolor }} />
                {ride.destination}
              </div>
              <div className="ride-eta">
                hits Oakland in {minutesFromNow(ride.reachesOaklandAt)}m
                {!ride.alreadyLeftOrigin && <> · hasn&rsquo;t picked you up yet</>}
              </div>
            </div>
            <button
              onClick={() => step(1)}
              disabled={selectedIndex >= rides.length - 1}
              aria-label="later train"
            >
              ›
            </button>
          </div>

          <TrackView ride={ride} />

          {ride.recommendedStation && (
            <div className="verdict">
              Get off at{' '}
              <strong>
                {
                  ride.options.find((o) => o.recommended)?.stationName ??
                    ride.recommendedStation
                }
              </strong>
              <div className="verdict-why">
                {ride.beatsTheRush
                  ? 'same train as the later stops — board early, beat the rush'
                  : ride.savesMinutes > 0
                    ? `${ride.savesMinutes}m sooner than waiting for ${ride.savesAgainst}`
                    : 'your only connection on this train'}
              </div>
            </div>
          )}

          <div className="stations">
            {ride.options.map((option) => (
              <StationRow key={option.station} option={option} />
            ))}
          </div>
        </>
      )}

      <div className="data-freshness">
        {fetchedAt && <span className="status">trains {fetchedAt.fromNow()}</span>}
        <button onClick={load}>Reload</button>
        {gtfsRt.error && (
          <span className="error" style={{ color: '#c00', marginLeft: '0.5rem' }}>
            {gtfsRt.error}
          </span>
        )}
      </div>
    </div>
  )
}

export default TransferMagic
