import { configureStore } from '@reduxjs/toolkit'
import settingsReducer from './settingsSlice'
import stationETDsReducer from './stationETDsSlice'
import bartAdvisoriesReducer from './bartAdvisoriesSlice'
import userLocationReducer from './userLocationSlice'
import type { RootState } from '../types'

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    stationETDs: stationETDsReducer,
    bartAdvisories: bartAdvisoriesReducer,
    userLocation: userLocationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore dayjs objects in actions and state
        ignoredActions: ['stationETDs/fetch/fulfilled'],
        ignoredPaths: ['stationETDs'],
      },
    }),
})

export type AppDispatch = typeof store.dispatch
export type { RootState }

// Export hooks for use in components
export { useDispatch, useSelector } from 'react-redux'
