import { checkFetchStatus, bartStationETDsUrl } from "../utilities"

export const REQUEST_STATION_ETDS = "REQUEST_STATION_ETDS"
export const RECEIVE_STATION_ETDS = "RECEIVE_STATION_ETDS"
export const RECEIVE_STATION_ETDS_ERROR = "RECEIVE_STATION_ETDS_ERROR"

function requestStationETDs(station, dir) {
  return {
    type: REQUEST_STATION_ETDS,
    meta: { station, dir },
  }
}

function receiveStationETDs(station, dir, payload) {
  return {
    type: RECEIVE_STATION_ETDS,
    meta: { station, dir },
    payload,
  }
}

function receiveStationETDsError(station, dir, error) {
  console.error(error)
  return {
    type: RECEIVE_STATION_ETDS_ERROR,
    meta: { station, dir },
    error,
  }
}

export function fetchStationETDs(station, dir = null) {
  return (dispatch, getState) => {
    dispatch(requestStationETDs(station, dir))

    let url = bartStationETDsUrl(station, dir)

    return fetch(url)
      .then(checkFetchStatus)
      .then(req => req.json())
      .then(data => dispatch(receiveStationETDs(station, dir, data)))
      .catch(e => dispatch(receiveStationETDsError(station, dir, e)))
  }
}
