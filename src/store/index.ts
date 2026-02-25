import { configureStore } from '@reduxjs/toolkit'
import settingsReducer from './settingsSlice'
import gtfsRtReducer from './gtfsRtSlice'
import userLocationReducer from './userLocationSlice'
import type { RootState } from '../types'

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    gtfsRt: gtfsRtReducer,
    userLocation: userLocationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore dayjs objects in actions and state
        ignoredActions: ['gtfsRt/fetch/fulfilled'],
        ignoredPaths: ['gtfsRt.fetchedAt'],
      },
    }),
})

export type AppDispatch = typeof store.dispatch
export type { RootState }

// Export hooks for use in components
export { useDispatch, useSelector } from 'react-redux'
