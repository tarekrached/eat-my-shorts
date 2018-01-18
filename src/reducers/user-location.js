import {
  REQUEST_USER_LOCATION,
  RECEIVE_USER_LOCATION,
  RECEIVE_USER_LOCATION_ERROR,
} from "../actions/"

const defaultState = {
  position: undefined,
  isFetching: false,
  error: false,
}

export default function userLocation(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_USER_LOCATION:
      return Object.assign({}, state, {
        isFetching: true,
        error: false,
      })
    case RECEIVE_USER_LOCATION:
      return Object.assign({}, state, {
        position: action.payload,
        isFetching: false,
        error: false,
      })
    case RECEIVE_USER_LOCATION_ERROR:
      return Object.assign({}, state, {
        isFetching: false,
        error: action.error,
      })
    default:
      return state
  }
}
