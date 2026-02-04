import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { fetchStationETDs } from '../store/stationETDsSlice'
import { fetchBartAdvisories } from '../store/bartAdvisoriesSlice'
import { updateSettings } from '../store/settingsSlice'
import { currentStationEtdsSelector } from '../selectors'
import { stationsHome, settingsPresets } from '../utilities'
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
    const newSettings = settingsPresets.find(
      (d) => d.preset !== settings.preset
    )

    if (newSettings) {
      dispatch(updateSettings(newSettings))
      dispatch(
        fetchStationETDs({
          station: newSettings.currentBartStation,
          dir: newSettings.bartDirection,
        })
      )
    }
  }

  const {
    preset,
    currentBartStation,
    bartDirection,
    walkingMinutes,
    bartMinutes,
  } = settings

  return (
    <div className="bart-home">
      <div className="top-menu">
        <div>
          preset: {preset} <button onClick={switchPreset}>switch</button>
        </div>

        <Link to="/transfer-magic">Transfer!</Link>
      </div>
      <div className="bart-trains">
        {stationETDs.trains && (
          <div id="bart-trains">
            {stationETDs.trains.map((train, i) => (
              <div className="train" key={i}>
                <span
                  className="color"
                  style={{ backgroundColor: train.hexcolor }}
                />{' '}
                <span className="minutes">{train.at.fromNow(true)}</span>{' '}
                <span className="destination">{train.destination}</span>{' '}
                <span className="length">{train.length} car</span>{' '}
                <span className="home-time">
                  {train.etd?.format('h:mm a')}
                </span>
              </div>
            ))}
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
      <div id="en-route-times">
        <ul id="bart-station-times">
          {stationsHome.map(([name, mins, abbr]) => (
            <li key={abbr}>
              <a href={`https://www.bart.gov/schedules/eta/${abbr}`}>
                {name}
              </a>
              : {mins} mins
            </li>
          ))}
        </ul>
      </div>
      <p id="estimate-info">
        Arrival estimates include {bartMinutes} minutes on train and{' '}
        {walkingMinutes} minutes on foot.
      </p>
    </div>
  )
}

export default Trip
