import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import { fetchGtfsRtData } from '../store/gtfsRtSlice'
import { inlinePreviewSelector } from '../selectors'
import type { RootState, AppDispatch } from '../store'
import type { InlineRow } from '../selectors/inlinePreview'

/**
 * EXPERIMENTAL third view. The departure list, with the transfer verdict and a
 * real arrival time on every row.
 *
 * It is instrumented, because the thing worth knowing about this idea is not
 * whether it fits on screen but whether the numbers hold still. A transfer
 * arrival predicted from Montgomery depends on a train that hasn't left yet,
 * so it may well thrash until you're through the tube. Each row therefore
 * records what it was told on every poll and reports how far the answer has
 * moved and how often the recommended station changed. Watch the drift column
 * at the platform and then again in the tube; if it settles, the inline idea
 * works, and if it doesn't, the standalone transfer view is the right home for
 * this after all.
 */

interface Drift {
  homeAts: number[]
  stations: (string | null)[]
}

const spreadMinutes = (values: number[]): number => {
  if (values.length < 2) return 0
  return Math.round((Math.max(...values) - Math.min(...values)) / 60)
}

const flipCount = (values: (string | null)[]): number =>
  values.reduce((count, value, i) => (i > 0 && value !== values[i - 1] ? count + 1 : count), 0)

function Row({ row, drift }: { row: InlineRow; drift: Drift | undefined }) {
  const { train } = row
  const now = dayjs()
  const leaveInMinutes = Math.floor(train.leaveBy.diff(now, 'second') / 60)
  const trainInMinutes = Math.floor(train.at.diff(now, 'second') / 60)
  const isMissed = train.leaveBy.diff(now, 'second') < 0

  const samples = drift?.stations.length ?? 0
  const spread = drift ? spreadMinutes(drift.homeAts) : 0
  const flips = drift ? flipCount(drift.stations) : 0

  return (
    <div className={`inline-row${isMissed ? ' missed' : ''}`}>
      <div className="inline-main">
        <span className="color" style={{ backgroundColor: train.hexcolor }} />
        <span className="leave-by">
          🚶 {leaveInMinutes}
          <span className="unit">m</span>
        </span>
        <span className="train-departs">
          🚆 {trainInMinutes}
          <span className="unit">m</span>
        </span>
        <span className="destination">{train.destination}</span>
        {row.transferStation ? (
          <span className="via">
            ⇄ {row.transferStationName}
            {row.connectionHexcolor && (
              <span className="color" style={{ backgroundColor: row.connectionHexcolor }} />
            )}
          </span>
        ) : (
          // A train with no resolvable route isn't "direct", it's a dead end;
          // the drift line below says so rather than mislabelling it here.
          !row.unresolved && <span className="via direct">direct</span>
        )}
        <span className="home-time">
          {row.homeAt ? row.homeAt.format('h:mm a') : '—'}
        </span>
      </div>
      <div className="inline-drift">
        {row.transferStation && <span>wait {row.waitMinutes}m</span>}
        {/* Blue and Green trains stop here but never touch the Oakland wye, so
            there is no way home on them. The main view hides this behind a
            fixed-duration estimate and quotes an arrival time anyway. */}
        {row.unresolved === 'no-route' && <span className="warn">no route home</span>}
        {row.unresolved === 'no-connection' && (
          <span>onward train not published yet</span>
        )}
        {samples > 1 && (
          <span className={spread > 2 || flips > 0 ? 'warn' : ''}>
            drift ±{spread}m
            {flips > 0 && ` · station changed ${flips}×`}
            {` · ${samples} polls`}
          </span>
        )}
      </div>
    </div>
  )
}

function InlinePreview() {
  const dispatch = useDispatch<AppDispatch>()
  const [, setTick] = useState(0)
  const driftRef = useRef<Map<string, Drift>>(new Map())

  const gtfsRt = useSelector((state: RootState) => state.gtfsRt)
  const pollingInterval = useSelector(
    (state: RootState) => state.settings.pollingIntervalSeconds
  )
  const { loading, fetchedAt, destinationName, rows } = useSelector(inlinePreviewSelector)

  const load = useCallback(() => {
    dispatch(fetchGtfsRtData())
  }, [dispatch])

  const staticFetchedAt = gtfsRt.gtfsStatic?.fetchedAt ?? null
  useEffect(() => {
    if (!staticFetchedAt) return
    load()
    const timer = setInterval(load, pollingInterval * 1000)
    return () => clearInterval(timer)
  }, [load, pollingInterval, staticFetchedAt])

  useEffect(() => {
    const timer = setInterval(() => setTick((c) => c + 1), 1_000)
    return () => clearInterval(timer)
  }, [])

  // Record one sample per poll, keyed on the trip so a row keeps its history
  // as it moves up the list. Trips that fall off the list keep their entry,
  // which costs nothing and avoids resetting a row that briefly disappears.
  const pollStamp = fetchedAt?.valueOf() ?? 0
  const lastSampledRef = useRef(0)
  useEffect(() => {
    // Guard on the stamp rather than just the dependency: StrictMode runs
    // effects twice in dev, which would otherwise double every sample.
    if (!pollStamp || lastSampledRef.current === pollStamp) return
    lastSampledRef.current = pollStamp
    for (const row of rows) {
      const existing = driftRef.current.get(row.train.tripId) ?? { homeAts: [], stations: [] }
      // Record the station on every poll, including polls where the answer went
      // away entirely: a row flapping between "via 12th" and no route at all is
      // the least stable case there is, and skipping those samples would hide
      // exactly the instability this instrument exists to measure.
      existing.stations.push(row.transferStation)
      if (row.homeAt) existing.homeAts.push(row.homeAt.unix())
      driftRef.current.set(row.train.tripId, existing)
    }
    // rows is recomputed on each poll; pollStamp is what actually gates a sample
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollStamp])

  const resetDrift = () => {
    driftRef.current = new Map()
    setTick((c) => c + 1)
  }

  return (
    <div className="inline-preview">
      <div className="top-menu">
        <div>inline → {destinationName}</div>
        <span>
          <Link to="/">Home</Link> <Link to="/transfer-magic">Transfer</Link>
        </span>
      </div>

      <p className="inline-note">
        Experimental. Every arrival below is read from real stop times, via the
        recommended Oakland transfer where one is needed. Watch the drift figures
        here and again in the tube to see whether these numbers hold still.
      </p>

      {loading && !rows.length && <div className="loading">loading</div>}

      {rows.map((row) => (
        <Row key={row.train.tripId} row={row} drift={driftRef.current.get(row.train.tripId)} />
      ))}

      <div className="data-freshness">
        {fetchedAt && <span className="status">trains {fetchedAt.fromNow()}</span>}
        <button onClick={load}>Reload</button>
        <button onClick={resetDrift}>Reset drift</button>
        {gtfsRt.error && (
          <span className="error" style={{ color: '#c00', marginLeft: '0.5rem' }}>
            {gtfsRt.error}
          </span>
        )}
      </div>
    </div>
  )
}

export default InlinePreview
