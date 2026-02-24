import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import { fetchStationETDs } from '../store/stationETDsSlice'
import { fetchBartAdvisories } from '../store/bartAdvisoriesSlice'
import { setActivePreset } from '../store/settingsSlice'
import { currentStationEtdsSelector } from '../selectors'
import type { RootState, AppDispatch } from '../store'
import { useDispatch } from 'react-redux'

function Trip() {
  const dispatch = useDispatch<AppDispatch>()
  const [, setCounter] = useState(0)

  const settings = useSelector((state: RootState) => state.settings)
  const stationETDs = useSelector(currentStationEtdsSelector)
  const bartAdvisories = useSelector((state: RootState) => state.bartAdvisories)

  const load = useCallback(() => {
    dispatch(
      fetchStationETDs({
        station: settings.currentBartStation,
        dir: settings.bartDirection,
      })
    )
    dispatch(fetchBartAdvisories())
  }, [dispatch, settings.currentBartStation, settings.bartDirection])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      setCounter((c) => c + 1)
    }, 3000)

    return () => clearInterval(timer)
  }, [load])

  const handleReload = () => load()

  const switchPreset = () => {
    const nextIndex: 0 | 1 = settings.activePresetIndex === 0 ? 1 : 0
    dispatch(setActivePreset(nextIndex))
    const nextPreset = settings.presets[nextIndex]
    dispatch(
      fetchStationETDs({
        station: nextPreset.currentBartStation,
        dir: nextPreset.bartDirection,
      })
    )
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
              const leaveInMinutes = train.leaveBy?.diff(now, 'minute')
              const trainInMinutes = train.at.diff(now, 'minute')
              const isMissed = leaveInMinutes !== undefined && leaveInMinutes < 0
              return (
              <div className={`train${isMissed ? ' missed' : ''}`} key={i}>
                <span
                  className="color"
                  style={{ backgroundColor: train.hexcolor }}
                />{' '}
                <span className={`leave-by${isMissed ? ' missed' : ''}`}>
                  🚶 {leaveInMinutes}<span className="unit">m</span>
                </span>{' '}
                <span className="train-departs">🚆 {trainInMinutes}<span className="unit">m</span></span>{' '}
                <span className="destination">{train.destination}</span>{' '}
                <span className="length">{train.length} car</span>{' '}
                <span className="home-time">
                  {train.etd?.format('h:mm a')}
                </span>
              </div>
              )}
            )}
          </div>
        )}
      </div>
      <div id="bart-advisories">
        <a href="http://m.bart.gov/schedules/advisories">BART Advisories</a>:{' '}
        {bartAdvisories.isFetching && (
          <span className="loading">loading advisories</span>
        )}
        {bartAdvisories.bartAdvisories && (
          <span id="bart-advisory-list">
            {bartAdvisories.bartAdvisories.map((adv: string, i: number) => (
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
      </div>
      <p id="estimate-info">
        Arrival estimates include {bartMinutes} min on train,{' '}
        {homeWalkingMinutes} min walk (home), {workWalkingMinutes} min walk (work).
      </p>
      <Link to="/settings" title="Settings" className="settings-link">&#9881;</Link>
    </div>
  )
}

export default Trip
