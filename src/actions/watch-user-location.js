export const REQUEST_USER_LOCATION = "REQUEST_USER_LOCATION"
export const RECEIVE_USER_LOCATION = "RECEIVE_USER_LOCATION"
export const RECEIVE_USER_LOCATION_ERROR = "RECEIVE_USER_LOCATION_ERROR"

function requestUserLocation() {
  return {
    type: REQUEST_USER_LOCATION,
  }
}

function receiveUserLocation(payload) {
  return {
    type: RECEIVE_USER_LOCATION,
    payload,
  }
}

function receiveUserLocationError(error) {
  console.error(error)
  return {
    type: RECEIVE_USER_LOCATION_ERROR,
    error,
  }
}

export function getUserLocation() {
  return (dispatch, getState) => {
    dispatch(requestUserLocation())

    navigator.geolocation.getCurrentPosition(
      pos => dispatch(receiveUserLocation(pos)),
      e => dispatch(receiveUserLocationError(e))
    )
  }
}
