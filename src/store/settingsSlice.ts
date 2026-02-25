import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Settings, TripPreset, TrainColor } from '../types'
import { defaultPresets, buildInitialSettings } from '../utilities'

const STORAGE_KEY = 'ems-settings'

interface PersistedSettings {
  presets: [TripPreset, TripPreset]
  autoSwitch: boolean
  autoSwitchHour: number
  homeStation: string
  workStation: string
  homeWalkingMinutes: number
  workWalkingMinutes: number
  pollingIntervalSeconds: number
  trainColors?: TrainColor[]
}

const loadFromStorage = (): PersistedSettings | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSettings
  } catch {
    return null
  }
}

const saveToStorage = (state: Settings): void => {
  try {
    const persisted: PersistedSettings = {
      presets: state.presets,
      autoSwitch: state.autoSwitch,
      autoSwitchHour: state.autoSwitchHour,
      homeStation: state.homeStation,
      workStation: state.workStation,
      homeWalkingMinutes: state.homeWalkingMinutes,
      workWalkingMinutes: state.workWalkingMinutes,
      pollingIntervalSeconds: state.pollingIntervalSeconds,
      trainColors: state.trainColors,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // ignore storage errors
  }
}

const saved = loadFromStorage()
const initialState: Settings = {
  ...buildInitialSettings(
    saved?.presets ?? defaultPresets,
    saved?.autoSwitch ?? true,
    saved?.autoSwitchHour ?? 12,
    saved?.homeWalkingMinutes ?? 9,
    saved?.workWalkingMinutes ?? 10,
  ),
  homeStation: saved?.homeStation ?? 'NBRK',
  workStation: saved?.workStation ?? 'MONT',
  pollingIntervalSeconds: saved?.pollingIntervalSeconds ?? 60,
  trainColors: saved?.trainColors,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setActivePreset: (state, action: PayloadAction<0 | 1>) => {
      const index = action.payload
      const preset = state.presets[index]
      const next: Settings = {
        ...state,
        activePresetIndex: index,
        currentBartStation: preset.currentBartStation,
        bartDirection: preset.bartDirection,
        bartMinutes: preset.bartMinutes,
      }
      saveToStorage(next)
      return next
    },
    updatePreset: (
      state,
      action: PayloadAction<{ index: 0 | 1; preset: TripPreset }>
    ) => {
      const { index, preset } = action.payload
      const newPresets: [TripPreset, TripPreset] = [
        ...state.presets,
      ] as [TripPreset, TripPreset]
      newPresets[index] = preset
      const active = newPresets[state.activePresetIndex]
      const next: Settings = {
        ...state,
        presets: newPresets,
        currentBartStation: active.currentBartStation,
        bartDirection: active.bartDirection,
        bartMinutes: active.bartMinutes,
      }
      saveToStorage(next)
      return next
    },
    setAutoSwitch: (
      state,
      action: PayloadAction<{ autoSwitch: boolean; autoSwitchHour: number }>
    ) => {
      const next: Settings = { ...state, ...action.payload }
      saveToStorage(next)
      return next
    },
    saveStations: (
      state,
      action: PayloadAction<{
        homeStation: string
        workStation: string
        homeWalkingMinutes: number
        workWalkingMinutes: number
      }>
    ) => {
      const next: Settings = { ...state, ...action.payload }
      saveToStorage(next)
      return next
    },
    setTrainColors: (state, action: PayloadAction<TrainColor[] | undefined>) => {
      const next: Settings = { ...state, trainColors: action.payload }
      saveToStorage(next)
      return next
    },
    setPollingInterval: (state, action: PayloadAction<number>) => {
      const next: Settings = { ...state, pollingIntervalSeconds: action.payload }
      saveToStorage(next)
      return next
    },
    // Kept for backward compatibility (used by TransferMagic and others)
    updateSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      return { ...state, ...action.payload }
    },
  },
})

export const { setActivePreset, updatePreset, setAutoSwitch, saveStations, setTrainColors, setPollingInterval, updateSettings } =
  settingsSlice.actions
export default settingsSlice.reducer
