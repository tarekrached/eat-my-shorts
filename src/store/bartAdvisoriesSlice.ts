import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { BartAdvisoriesState, BSAResponse } from '../types'
import { bartAdvisoriesUrl, checkFetchStatus } from '../utilities'

const initialState: BartAdvisoriesState = {
  isFetching: false,
  bartAdvisories: [],
  error: false,
}

export const fetchBartAdvisories = createAsyncThunk(
  'bartAdvisories/fetch',
  async () => {
    const response = await fetch(bartAdvisoriesUrl)
    checkFetchStatus(response)
    const data = await response.json() as BSAResponse
    return data
  }
)

const bartAdvisoriesSlice = createSlice({
  name: 'bartAdvisories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBartAdvisories.pending, (state) => {
        state.isFetching = true
      })
      .addCase(fetchBartAdvisories.fulfilled, (state, action) => {
        state.isFetching = false
        const advisories = action.payload.root.bsa?.map(
          (advisory) => advisory.description['#cdata-section']
        ) || []
        state.bartAdvisories = advisories
        state.error = false
      })
      .addCase(fetchBartAdvisories.rejected, (state, action) => {
        state.isFetching = false
        state.error = action.error.message || 'Unknown error'
      })
  },
})

export default bartAdvisoriesSlice.reducer
