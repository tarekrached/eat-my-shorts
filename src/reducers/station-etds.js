import moment from "moment"

import {
  REQUEST_STATION_ETDS,
  RECEIVE_STATION_ETDS,
  RECEIVE_STATION_ETDS_ERROR,
} from "../actions/"

const defaultStation = {
  isFetching: true,
  error: false,
}
const defaultState = {}

export default function stationETDs(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_STATION_ETDS:
      let { station } = action.meta

      const stationUpdate = Object.assign(state[station] || defaultStation, {
        isFetching: true,
      })

      return Object.assign({}, state, { [station]: stationUpdate })

    case RECEIVE_STATION_ETDS:
      const {
        root: { date, time, station: [{ etd: destinations }] },
      } = action.payload

      const at = moment(date + time, "MM/DD/YYYYHH:mm:ss a")

      const trains = destinations
        .reduce(
          (acc, { destination, abbreviation, limited, estimate }) =>
            acc.concat(
              estimate.map(train => {
                const intMinutes =
                  train.minutes === "Leaving" ? 0 : parseInt(train.minutes, 10)
                return Object.assign(train, {
                  destination,
                  abbreviation,
                  limited,
                  intMinutes,
                  at: at.clone().add(intMinutes, "minutes"),
                })
              })
            ),
          []
        )
        .sort((a, b) => a.at.diff(b.at))

      const updatedStation = {
        isFetching: false,
        trains,
        at,
      }

      return Object.assign({}, state, { [action.meta.station]: updatedStation })

    case RECEIVE_STATION_ETDS_ERROR:
      const errorStation = Object.assign({}, state[action.meta.station], {
        error: action.error,
      })
      return Object.assign({}, state, { [action.meta.station]: errorStation })

    default:
      return state
  }
}
