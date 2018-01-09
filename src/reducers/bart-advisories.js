import {
  REQUEST_BART_ADVISORIES,
  RECEIVE_BART_ADVISORIES,
  RECEIVE_BART_ADVISORIES_ERROR,
} from "../actions/"

const defaultState = {
  bartAdvisories: undefined,
  isFetching: true,
  error: false,
}

export default function bartAdvisories(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_BART_ADVISORIES:
      return Object.assign({}, state, defaultState, {
        isFetching: true,
        error: false,
      })
    case RECEIVE_BART_ADVISORIES:
      return Object.assign({}, state, {
        bartAdvisories: action.payload.root.bsa.map(
          i => i.description["#cdata-section"]
        ),
        isFetching: false,
        error: false,
      })
    case RECEIVE_BART_ADVISORIES_ERROR:
      return Object.assign({}, state, {
        isFetching: false,
        error: action.error,
      })
    default:
      return state
  }
}
