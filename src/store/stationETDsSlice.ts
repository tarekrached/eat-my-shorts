import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import type { StationETDsState, TrainEstimate } from '../types'
import { bartStationETDsUrl, checkFetchStatus } from '../utilities'
import type { ETDResponse } from '../types'

const initialState: StationETDsState = {}

export const fetchStationETDs = createAsyncThunk(
  'stationETDs/fetch',
  async ({ station, dir }: { station: string; dir?: string | null }) => {
    const url = bartStationETDsUrl(station, dir || null)
    const response = await fetch(url)
    checkFetchStatus(response)
    const data = await response.json() as ETDResponse
    return { station, data }
  }
)

const stationETDsSlice = createSlice({
  name: 'stationETDs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStationETDs.pending, (state, action) => {
        const station = action.meta.arg.station
        state[station] = {
          ...state[station],
          isFetching: true,
          trains: state[station]?.trains || [],
          at: state[station]?.at || dayjs(),
        }
      })
      .addCase(fetchStationETDs.fulfilled, (state, action) => {
        const { station, data } = action.payload
        const {
          root: {
            date,
            time,
            station: [{ etd: destinations }],
          },
        } = data

        const at = dayjs(date + ' ' + time, 'MM/DD/YYYY hh:mm:ss a')

        const trains: TrainEstimate[] = destinations
          .flatMap(({ destination, abbreviation, limited, estimate }) =>
            estimate.map((train) => {
              const intMinutes =
                train.minutes === 'Leaving' ? 0 : parseInt(train.minutes, 10)
              return {
                ...train,
                destination,
                abbreviation,
                limited,
                intMinutes,
                at: at.add(intMinutes, 'minutes'),
              }
            })
          )
          .sort((a, b) => a.at.diff(b.at))

        state[station] = {
          isFetching: false,
          trains,
          at,
        }
      })
      .addCase(fetchStationETDs.rejected, (state, action) => {
        const station = action.meta.arg.station
        state[station] = {
          ...state[station],
          isFetching: false,
          error: action.error.message,
          trains: state[station]?.trains || [],
          at: state[station]?.at || dayjs(),
        }
      })
  },
})

export default stationETDsSlice.reducer
