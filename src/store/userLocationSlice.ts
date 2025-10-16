import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { UserLocationState, UserPosition } from '../types'

const initialState: UserLocationState = {
  isFetching: false,
  position: null,
  error: false,
}

export const getUserLocation = createAsyncThunk(
  'userLocation/get',
  async (): Promise<UserPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          })
        },
        (error) => {
          reject(new Error(error.message))
        }
      )
    })
  }
)

const userLocationSlice = createSlice({
  name: 'userLocation',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getUserLocation.pending, (state) => {
        state.isFetching = true
      })
      .addCase(getUserLocation.fulfilled, (state, action) => {
        state.isFetching = false
        state.position = action.payload
        state.error = false
      })
      .addCase(getUserLocation.rejected, (state, action) => {
        state.isFetching = false
        state.error = action.error.message || 'Unknown error'
      })
  },
})

export default userLocationSlice.reducer
