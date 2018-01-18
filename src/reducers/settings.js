import { UPDATE_SETTINGS } from "../actions/"

const defaultState =
  new Date().getHours() < 12
    ? {
        currentBartStation: "NBRK",
        bartDestination: "MONT",
        bartMinutes: 25,
        bartDirection: "South",
        walkingMinutes: 5,
      }
    : {
        currentBartStation: "MONT",
        bartDestination: "NBRK",
        bartMinutes: 25,
        bartDirection: "North",
        trainColors: ["RED", "YELLOW"],
        walkingMinutes: 9,
      }

export default function settings(state = defaultState, action) {
  switch (action.type) {
    case UPDATE_SETTINGS:
      return Object.assign({}, state, action.payload)
    default:
      return state
  }
}
