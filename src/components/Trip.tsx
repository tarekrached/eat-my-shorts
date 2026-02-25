import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import { fetchGtfsRtData } from '../store/gtfsRtSlice'
import { setActivePreset } from '../store/settingsSlice'
import { currentStationEtdsSelector } from '../selectors'
import type { RootState, AppDispatch } from '../store'

function Trip() {
  const dispatch = useDispatch<AppDispatch>()
  const [, setTick] = useState(0)

  const settings = useSelector((state: RootState) => state.settings)
  const stationETDs = useSelector(currentStationEtdsSelector)
  const gtfsRt = useSelector((state: RootState) => state.gtfsRt)

  const pollingInterval = settings.pollingIntervalSeconds

  const load = useCallback(() => {
    dispatch(fetchGtfsRtData())
  }, [dispatch])

  // Fetch real-time data on mount and on polling interval.
  // Wait until GTFS static data is available so stop IDs can be mapped.
  const hasStaticData = !!gtfsRt.gtfsStatic
  useEffect(() => {
    if (!hasStaticData) return
    load()
    const timer = setInterval(load, pollingInterval * 1000)
    return () => clearInterval(timer)
  }, [load, pollingInterval, hasStaticData])

  // Re-render every 1s so the seconds countdown ticks smoothly (no refetch)
  useEffect(() => {
    const timer = setInterval(() => setTick((c) => c + 1), 1_000)
    return () => clearInterval(timer)
  }, [])

  const handleReload = () => load()

  const switchPreset = () => {
    const nextIndex: 0 | 1 = settings.activePresetIndex === 0 ? 1 : 0
    dispatch(setActivePreset(nextIndex))
  }

  const {
    activePresetIndex,
    presets,
    currentBartStation,
    bartDirection,
    homeWalkingMinutes,
    workWalkingMinutes,
    bartMinutes,
  } = settings

  const activePresetName = presets[activePresetIndex].name

  return (
    <div className="bart-home">
      <div className="top-menu">
        <div>
          {activePresetName} <button onClick={switchPreset}>switch</button>
        </div>
        <Link to="/transfer-magic">Transfer!</Link>
      </div>
      <div className="bart-trains">
        {stationETDs.trains && (
          <div id="bart-trains">
            {stationETDs.trains.map((train, i) => {
              const now = dayjs()
              const leaveInSeconds = train.leaveBy.diff(now, 'second')
              const leaveInMinutes = Math.floor(leaveInSeconds / 60)
              const trainInSeconds = train.at.diff(now, 'second')
              const trainInMinutes = Math.floor(trainInSeconds / 60)
              const trainRemainderSec = trainInSeconds - trainInMinutes * 60
              const isMissed = leaveInSeconds < 0
              return (
                <div className={`train${isMissed ? ' missed' : ''}`} key={i}>
                  <span
                    className="color"
                    style={{ backgroundColor: train.hexcolor }}
                  />
                  <span className={`leave-by${isMissed ? ' missed' : ''}`}>
                    🚶 {leaveInMinutes}<span className="unit">m</span>
                  </span>
                  <span className="train-departs">
                    🚆 {trainInMinutes}<span className="unit">m</span>
                    {i < 2 && <span className="seconds">{String(Math.max(0, trainRemainderSec)).padStart(2, '0')}<span className="unit">s</span></span>}
                  </span>
                  <span className="destination">{train.destination}</span>
                  <span className="home-time">
                    {train.etd.format('h:mm a')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div id="bart-advisories">
        <a href="http://m.bart.gov/schedules/advisories">BART Advisories</a>:{' '}
        {gtfsRt.isFetching && !gtfsRt.alerts.length && (
          <span className="loading">loading advisories</span>
        )}
        {gtfsRt.alerts.length > 0 && (
          <span id="bart-advisory-list">
            {gtfsRt.alerts.map((adv: string, i: number) => (
              <span key={i}>{adv}</span>
            ))}
          </span>
        )}
      </div>
      <div className="data-freshness">
        {stationETDs.loading && (
          <span className="loading">
            loading {currentBartStation} {bartDirection} trains
          </span>
        )}
        {!stationETDs.loading && stationETDs.at && (
          <span className="status">
            {currentBartStation} {bartDirection} trains{' '}
            {stationETDs.at.fromNow()}
          </span>
        )}
        <button onClick={handleReload}>Reload</button>
        {gtfsRt.error && (
          <span className="error" style={{ color: '#c00', marginLeft: '0.5rem' }}>
            {gtfsRt.error}
          </span>
        )}
      </div>
      <p id="estimate-info">
        Arrival estimates include {bartMinutes} min on train,{' '}
        {homeWalkingMinutes} min walk (home), {workWalkingMinutes} min walk (work).
        Refreshing every {pollingInterval}s.
      </p>
      <Link to="/settings" title="Settings" className="settings-link">&#9881;</Link>
    </div>
  )
}

export default Trip
