import { UPDATE_SETTINGS } from "../actions/"

const defaultState =
  new Date().getHours() < 12
    ? {
        currentBartStation: "NBRK",
        bartDirection: "South",
        walkingMinutes: 5,
        trainTime: 25,
      }
    : {
        currentBartStation: "MONT",
        bartDirection: "North",
        walkingMinutes: 9,
        trainTime: 25,
        trainColors: ["RED", "YELLOW"],
      }

export default function settings(state = defaultState, action) {
  switch (action.type) {
    case UPDATE_SETTINGS:
      return Object.assign({}, state, action.payload)
    default:
      return state
  }
}
