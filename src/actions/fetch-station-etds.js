import { checkFetchStatus, bartStationETDsUrl } from "../utilities"

export const REQUEST_STATION_ETDS = "REQUEST_STATION_ETDS"
export const RECEIVE_STATION_ETDS = "RECEIVE_STATION_ETDS"
export const RECEIVE_STATION_ETDS_ERROR = "RECEIVE_STATION_ETDS_ERROR"

function requestStationETDs(station) {
  return {
    type: REQUEST_STATION_ETDS,
    meta: { station },
  }
}

function receiveStationETDs(station, payload) {
  return {
    type: RECEIVE_STATION_ETDS,
    meta: { station },
    payload,
  }
}

function receiveStationETDsError(station, error) {
  console.error(error)
  return {
    type: RECEIVE_STATION_ETDS_ERROR,
    meta: { station },
    error,
  }
}

export function fetchStationETDs(station) {
  return (dispatch, getState) => {
    dispatch(requestStationETDs(station))

    let url = bartStationETDsUrl(station)

    return fetch(url)
      .then(checkFetchStatus)
      .then(req => req.json())
      .then(data => dispatch(receiveStationETDs(station, data)))
      .catch(e => dispatch(receiveStationETDsError(station, e)))
  }
}
