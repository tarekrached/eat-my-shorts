import { UPDATE_SETTINGS } from "../actions/"
import { settingsPresets } from "../utilities"

const preset = new Date().getHours() < 12 ? "home2Work" : "work2Home"
const defaultState = settingsPresets.find(d => d.preset === preset)

export default function settings(state = defaultState, action) {
  switch (action.type) {
    case UPDATE_SETTINGS:
      return Object.assign({}, state, action.payload)
    default:
      return state
  }
}
