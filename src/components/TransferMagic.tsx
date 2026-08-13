import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import { fetchGtfsRtData } from '../store/gtfsRtSlice'
import { transferMagicSelector } from '../selectors'
import type { RootState, AppDispatch } from '../store'
import type { TransferOption } from '../selectors/transferMagic'

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
      {reachable && option.sprint && (
        <div className="transfer-detail sprint">
          <span>🏃 {option.sprint.waitMinutes}m if you run</span>
          <span
            className="color"
            style={{ backgroundColor: option.sprint.train.hexcolor }}
          />
          <span className="transfer-connection">{option.sprint.train.destination}</span>
          <span className="home-time">{option.sprint.homeAt.format('h:mm a')}</span>
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
              {ride.sprintStation && (
                <div className="verdict-sprint">
                  🏃{' '}
                  {ride.sprintStation === ride.recommendedStation
                    ? `the ${ride.sprintWaitMinutes}m connection here`
                    : `${ride.sprintStationName} in ${ride.sprintWaitMinutes}m`}{' '}
                  gets you home {ride.sprintSavesMinutes}m sooner, if you make it
                </div>
              )}
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
