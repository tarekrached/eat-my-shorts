import { combineReducers } from "redux"

import settings from "./settings"
import stationETDs from "./station-etds"
import bartAdvisories from "./bart-advisories"

const reducers = combineReducers({
  settings,
  stationETDs,
  bartAdvisories,
})

export default reducers
