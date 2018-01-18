import { combineReducers } from "redux"

import settings from "./settings"
import stationETDs from "./station-etds"
import bartAdvisories from "./bart-advisories"
import userLocation from "./user-location"

const reducers = combineReducers({
  settings,
  stationETDs,
  bartAdvisories,
  userLocation,
})

export default reducers
