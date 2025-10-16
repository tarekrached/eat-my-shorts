import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Settings } from '../types'
import { settingsPresets } from '../utilities'

const preset = new Date().getHours() < 12 ? 'home2Work' : 'work2Home'
const initialState: Settings = settingsPresets.find(d => d.preset === preset)!

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      return { ...state, ...action.payload }
    },
  },
})

export const { updateSettings } = settingsSlice.actions
export default settingsSlice.reducer
