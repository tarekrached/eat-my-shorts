import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import type { GtfsRtState } from '../types'
import { fetchTripUpdates, fetchAlerts } from '../services/gtfs-rt'
import {
  fetchGtfsStaticData,
  loadFromStorage as loadGtfsStatic,
} from '../services/gtfs-static'
import type { RootState } from '../types'

// ── Thunks ───────────────────────────────────────────────────────────────

/** Fetch GTFS-RT trip updates + alerts in a single action. */
export const fetchGtfsRtData = createAsyncThunk(
  'gtfsRt/fetch',
  async (_, { getState }) => {
    const state = getState() as RootState
    const gtfsStatic = state.gtfsRt.gtfsStatic

    const [tripUpdates, alerts] = await Promise.all([
      fetchTripUpdates(gtfsStatic),
      fetchAlerts(),
    ])
    return { tripUpdates, alerts }
  }
)

/** Fetch (or refresh) the GTFS static lookup tables. */
export const refreshGtfsStatic = createAsyncThunk(
  'gtfsRt/refreshStatic',
  async () => {
    const data = await fetchGtfsStaticData()
    return data
  }
)

// ── Slice ────────────────────────────────────────────────────────────────

const cachedStatic = loadGtfsStatic()

const initialState: GtfsRtState = {
  isFetching: false,
  tripUpdates: [],
  alerts: [],
  fetchedAt: null,
  error: null,
  gtfsStatic: cachedStatic,
  gtfsStaticError: null,
}

const gtfsRtSlice = createSlice({
  name: 'gtfsRt',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ── Real-time data ──
      .addCase(fetchGtfsRtData.pending, (state) => {
        state.isFetching = true
        state.error = null
      })
      .addCase(fetchGtfsRtData.fulfilled, (state, action) => {
        state.isFetching = false
        state.tripUpdates = action.payload.tripUpdates
        state.alerts = action.payload.alerts
        state.fetchedAt = dayjs() as any // dayjs in Redux state (serializable check disabled)
        state.error = null
      })
      .addCase(fetchGtfsRtData.rejected, (state, action) => {
        state.isFetching = false
        state.error = action.error.message ?? 'Failed to fetch GTFS-RT data'
      })
      // ── Static data refresh ──
      .addCase(refreshGtfsStatic.fulfilled, (state, action) => {
        state.gtfsStatic = action.payload
        state.gtfsStaticError = null
      })
      .addCase(refreshGtfsStatic.rejected, (state, action) => {
        state.gtfsStaticError =
          action.error.message ?? 'Failed to fetch GTFS static data'
      })
  },
})

export default gtfsRtSlice.reducer
