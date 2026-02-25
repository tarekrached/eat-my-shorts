import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { updatePreset, setAutoSwitch, saveStations, setTrainColors, setPollingInterval } from '../store/settingsSlice'
import { refreshGtfsStatic } from '../store/gtfsRtSlice'
import type { RootState, AppDispatch } from '../store'
import type { TrainColor } from '../types'
import { inferDirection, fetchTravelMinutes } from '../utilities'
import bartStations from '../data/bart-stations.json'

const LINE_COLORS: { key: TrainColor; label: string; hex: string }[] = [
  { key: 'RED', label: 'Red', hex: '#ff0000' },
  { key: 'ORANGE', label: 'Orange', hex: '#ff9933' },
  { key: 'YELLOW', label: 'Yellow', hex: '#ffff33' },
  { key: 'GREEN', label: 'Green', hex: '#339933' },
  { key: 'BLUE', label: 'Blue', hex: '#0099cc' },
]

const POLLING_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
]

function Settings() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const settings = useSelector((state: RootState) => state.settings)
  const gtfsRt = useSelector((state: RootState) => state.gtfsRt)

  // Prefer dynamic station names from GTFS static; fall back to bundled JSON
  const dynamicStations = gtfsRt.gtfsStatic?.stationNames
  const stationOptions = dynamicStations
    ? Object.entries(dynamicStations).sort(([, a], [, b]) => a.localeCompare(b))
    : bartStations.map((s) => [s.abbr, s.name] as const)
  const stationName = (abbr: string) =>
    dynamicStations?.[abbr] ?? bartStations.find((s) => s.abbr === abbr)?.name ?? abbr

  const [homeStation, setHomeStation] = useState(settings.homeStation)
  const [workStation, setWorkStation] = useState(settings.workStation)
  const [homeWalkingMinutes, setHomeWalkingMinutes] = useState(settings.homeWalkingMinutes)
  const [workWalkingMinutes, setWorkWalkingMinutes] = useState(settings.workWalkingMinutes)
  const [autoSwitch, setAutoSwitchLocal] = useState(settings.autoSwitch)
  const [autoSwitchHour, setAutoSwitchHour] = useState(settings.autoSwitchHour)
  const [pollingInterval, setPollingIntervalLocal] = useState(settings.pollingIntervalSeconds)
  const allColors = LINE_COLORS.map((c) => c.key)
  const [trainColors, setLocalTrainColors] = useState<TrainColor[]>(
    settings.trainColors ?? allColors
  )

  const toggleColor = (color: TrainColor) => {
    setLocalTrainColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)

    if (homeStation === workStation) {
      setError('Home and work stations must be different.')
      return
    }

    const homeToWorkDir = inferDirection(homeStation, workStation)
    const workToHomeDir = inferDirection(workStation, homeStation)

    if (!homeToWorkDir || !workToHomeDir) {
      setError(
        `No direct route found between ${stationName(homeStation)} and ${stationName(workStation)}. Try swapping or picking closer stations.`
      )
      return
    }

    setSaving(true)
    try {
      const travelMinutes = await fetchTravelMinutes(homeStation, workStation)
      const colors = trainColors.length === allColors.length ? undefined : trainColors

      dispatch(
        updatePreset({
          index: 0,
          preset: {
            name: 'home → work',
            currentBartStation: homeStation,
            bartDirection: homeToWorkDir,
            bartMinutes: travelMinutes,
          },
        })
      )
      dispatch(
        updatePreset({
          index: 1,
          preset: {
            name: 'work → home',
            currentBartStation: workStation,
            bartDirection: workToHomeDir,
            bartMinutes: travelMinutes,
          },
        })
      )
      dispatch(setAutoSwitch({ autoSwitch, autoSwitchHour }))
      dispatch(setTrainColors(colors))
      dispatch(setPollingInterval(pollingInterval))
      dispatch(
        saveStations({
          homeStation,
          workStation,
          homeWalkingMinutes,
          workWalkingMinutes,
        })
      )

      // Refresh GTFS static data (route colors, trip metadata)
      dispatch(refreshGtfsStatic())

      navigate('/')
    } catch {
      setError('Could not fetch travel time from BART. Check your connection and try again.')
      setSaving(false)
    }
  }

  const gtfsAge = gtfsRt.gtfsStatic
    ? new Date(gtfsRt.gtfsStatic.fetchedAt).toLocaleDateString()
    : null

  return (
    <div className="settings-page">
      <div className="top-menu">
        <button type="button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <strong>Settings</strong>
        <span />
      </div>

      <div className="settings-field">
        <label>Station near home</label>
        <select value={homeStation} onChange={(e) => setHomeStation(e.target.value)}>
          {stationOptions.map(([abbr, name]) => (
            <option key={abbr} value={abbr}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-field">
        <label>Walk from home station (min)</label>
        <input
          type="number"
          min={0}
          max={60}
          value={homeWalkingMinutes}
          onChange={(e) => setHomeWalkingMinutes(parseInt(e.target.value) || 0)}
        />
      </div>

      <div className="settings-field" style={{ marginTop: '0.75rem' }}>
        <label>Station near work</label>
        <select value={workStation} onChange={(e) => setWorkStation(e.target.value)}>
          {stationOptions.map(([abbr, name]) => (
            <option key={abbr} value={abbr}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-field">
        <label>Walk from work station (min)</label>
        <input
          type="number"
          min={0}
          max={60}
          value={workWalkingMinutes}
          onChange={(e) => setWorkWalkingMinutes(parseInt(e.target.value) || 0)}
        />
      </div>

      <div className="settings-field" style={{ marginTop: '0.75rem' }}>
        <label>
          <input
            type="checkbox"
            checked={autoSwitch}
            onChange={(e) => setAutoSwitchLocal(e.target.checked)}
          />{' '}
          Auto-switch presets by time of day
        </label>
        {autoSwitch && (
          <div style={{ marginTop: '0.25rem' }}>
            <label>
              Switch to work → home after{' '}
              <input
                type="number"
                min={0}
                max={23}
                value={autoSwitchHour}
                onChange={(e) => setAutoSwitchHour(parseInt(e.target.value) || 0)}
                style={{ width: '3rem' }}
              />
              :00
            </label>
          </div>
        )}
      </div>

      <div className="settings-field" style={{ marginTop: '0.75rem' }}>
        <label>Refresh interval</label>
        <select
          value={pollingInterval}
          onChange={(e) => setPollingIntervalLocal(Number(e.target.value))}
        >
          {POLLING_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-field" style={{ marginTop: '0.75rem' }}>
        <label>Show train lines</label>
        <div className="line-filters">
          {LINE_COLORS.map(({ key, label, hex }) => (
            <label key={key} className="line-filter">
              <input
                type="checkbox"
                checked={trainColors.includes(key)}
                onChange={() => toggleColor(key)}
              />
              <span className="line-swatch" style={{ backgroundColor: hex }} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: '#c00', fontSize: '0.9rem', margin: '0.5rem 0' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{ fontSize: '1rem', padding: '0.5rem 1.5rem', marginTop: '0.5rem' }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>

      <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
        Direction and travel time are looked up automatically.
        Saving also refreshes GTFS schedule data
        {gtfsAge && <> (last fetched {gtfsAge})</>}.
      </p>
      {gtfsRt.gtfsStaticError && (
        <p style={{ color: '#c00', fontSize: '0.75rem' }}>
          GTFS refresh error: {gtfsRt.gtfsStaticError}
        </p>
      )}
    </div>
  )
}

export default Settings
