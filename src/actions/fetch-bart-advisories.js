import { checkFetchStatus, bartAdvisoriesUrl } from "../utilities"

export const REQUEST_BART_ADVISORIES = "REQUEST_BART_ADVISORIES"
export const RECEIVE_BART_ADVISORIES = "RECEIVE_BART_ADVISORIES"
export const RECEIVE_BART_ADVISORIES_ERROR = "RECEIVE_BART_ADVISORIES_ERROR"

function requestBartAdvisories() {
  return {
    type: REQUEST_BART_ADVISORIES,
  }
}

function receiveBartAdvisories(payload) {
  return {
    type: RECEIVE_BART_ADVISORIES,
    payload,
  }
}

function receiveBartAdvisoriesError(error) {
  console.error(error)
  return {
    type: RECEIVE_BART_ADVISORIES_ERROR,
    error,
  }
}

export function fetchBartAdvisories(station) {
  return (dispatch, getState) => {
    dispatch(requestBartAdvisories())

    return fetch(bartAdvisoriesUrl)
      .then(checkFetchStatus)
      .then(req => req.json())
      .then(data => dispatch(receiveBartAdvisories(data)))
      .catch(e => dispatch(receiveBartAdvisoriesError(e)))
  }
}
