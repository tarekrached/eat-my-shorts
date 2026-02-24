import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { updatePreset, setAutoSwitch, saveStations } from '../store/settingsSlice'
import type { RootState, AppDispatch } from '../store'
import type { TripPreset, TrainColor } from '../types'
import bartStations from '../data/bart-stations.json'

const ALL_COLORS: TrainColor[] = ['RED', 'YELLOW', 'BLUE', 'GREEN', 'ORANGE']

const COLOR_LABELS: Record<TrainColor, string> = {
  RED: 'Red',
  YELLOW: 'Yellow',
  BLUE: 'Blue',
  GREEN: 'Green',
  ORANGE: 'Orange',
}

interface PresetFormState {
  name: string
  currentBartStation: string
  bartDirection: 'North' | 'South'
  bartMinutes: number
  trainColors: TrainColor[]
  filterColors: boolean
}

const presetToForm = (preset: TripPreset): PresetFormState => ({
  name: preset.name,
  currentBartStation: preset.currentBartStation,
  bartDirection: preset.bartDirection,
  bartMinutes: preset.bartMinutes,
  trainColors: preset.trainColors ?? [],
  filterColors: !!preset.trainColors && preset.trainColors.length > 0,
})

const formToPreset = (form: PresetFormState): TripPreset => ({
  name: form.name,
  currentBartStation: form.currentBartStation,
  bartDirection: form.bartDirection,
  bartMinutes: form.bartMinutes,
  trainColors:
    form.filterColors && form.trainColors.length > 0
      ? form.trainColors
      : undefined,
})

interface PresetEditorProps {
  label: string
  form: PresetFormState
  onChange: (form: PresetFormState) => void
}

function PresetEditor({ label, form, onChange }: PresetEditorProps) {
  const toggleColor = (color: TrainColor) => {
    const current = form.trainColors
    const next = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color]
    onChange({ ...form, trainColors: next as TrainColor[] })
  }

  return (
    <fieldset style={{ marginBottom: '1rem', borderColor: '#ccc' }}>
      <legend style={{ fontWeight: 'bold' }}>{label}</legend>
      <div className="settings-field">
        <label>Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="settings-field">
        <label>Departure station</label>
        <select
          value={form.currentBartStation}
          onChange={(e) =>
            onChange({ ...form, currentBartStation: e.target.value })
          }
        >
          {bartStations.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="settings-field">
        <label>Direction</label>
        <span className="direction-toggle">
          {(['North', 'South'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              className={form.bartDirection === dir ? 'active' : ''}
              onClick={() => onChange({ ...form, bartDirection: dir })}
            >
              {dir}
            </button>
          ))}
        </span>
      </div>
      <div className="settings-field">
        <label>Train ride (min)</label>
        <input
          type="number"
          min={1}
          max={120}
          value={form.bartMinutes}
          onChange={(e) =>
            onChange({ ...form, bartMinutes: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="settings-field">
        <label>
          <input
            type="checkbox"
            checked={form.filterColors}
            onChange={(e) =>
              onChange({ ...form, filterColors: e.target.checked })
            }
          />{' '}
          Filter by train line
        </label>
        {form.filterColors && (
          <div className="color-filters">
            {ALL_COLORS.map((color) => (
              <label key={color} style={{ marginRight: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.trainColors.includes(color)}
                  onChange={() => toggleColor(color)}
                />
                {' ' + COLOR_LABELS[color]}
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  )
}

function Settings() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const settings = useSelector((state: RootState) => state.settings)

  const [presetForms, setPresetForms] = useState<[PresetFormState, PresetFormState]>([
    presetToForm(settings.presets[0]),
    presetToForm(settings.presets[1]),
  ])
  const [homeWalkingMinutes, setHomeWalkingMinutes] = useState(settings.homeWalkingMinutes)
  const [workWalkingMinutes, setWorkWalkingMinutes] = useState(settings.workWalkingMinutes)
  const [autoSwitch, setAutoSwitchLocal] = useState(settings.autoSwitch)
  const [autoSwitchHour, setAutoSwitchHour] = useState(settings.autoSwitchHour)

  const updateFormAt = (index: 0 | 1, form: PresetFormState) => {
    const next: [PresetFormState, PresetFormState] = [...presetForms] as [
      PresetFormState,
      PresetFormState,
    ]
    next[index] = form
    setPresetForms(next)
  }

  const handleSave = () => {
    dispatch(updatePreset({ index: 0, preset: formToPreset(presetForms[0]) }))
    dispatch(updatePreset({ index: 1, preset: formToPreset(presetForms[1]) }))
    dispatch(setAutoSwitch({ autoSwitch, autoSwitchHour }))
    dispatch(
      saveStations({
        homeStation: settings.homeStation,
        workStation: settings.workStation,
        homeWalkingMinutes,
        workWalkingMinutes,
      })
    )
    navigate('/')
  }

  return (
    <div className="settings-page">
      <div className="top-menu">
        <button type="button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <strong>Settings</strong>
        <span />
      </div>

      <div className="settings-section">
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
        <div className="settings-field">
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
                Switch to Preset B after{' '}
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={autoSwitchHour}
                  onChange={(e) =>
                    setAutoSwitchHour(parseInt(e.target.value) || 0)
                  }
                  style={{ width: '3rem' }}
                />
                :00
              </label>
            </div>
          )}
        </div>
      </div>

      <PresetEditor
        label="Preset A"
        form={presetForms[0]}
        onChange={(f) => updateFormAt(0, f)}
      />
      <PresetEditor
        label="Preset B"
        form={presetForms[1]}
        onChange={(f) => updateFormAt(1, f)}
      />

      <button type="button" onClick={handleSave} style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>
        Save
      </button>
    </div>
  )
}

export default Settings
