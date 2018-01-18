import { createSelector } from "reselect"
import { geoDistance } from "d3-geo"
import { min } from "d3-array"

import { getBearing } from "../utilities"
import rawBartStations from "../data/bart-stations.json"
import bartRoutes from "../data/bart-routes.json"

const bartStations = rawBartStations.map(s =>
  Object.assign({}, s, {
    lat: parseFloat(s.gtfs_latitude),
    lon: parseFloat(s.gtfs_longitude),
  })
)
const bartStationMap = bartStations.reduce(
  (acc, s) => Object.assign(acc, { [s.abbr]: s }),
  {}
)

bartStations.forEach(s => {
  const abbr = s.abbr
  const allAdjacencies = bartRoutes.reduce((acc, { config: { station } }) => {
    const idx = station.indexOf(abbr)
    if (idx === -1) {
      return acc
    }
    if (idx === 0) {
      return acc.concat(station[1])
    }
    if (idx === station.length - 1) {
      return acc.concat(station[station.length - 2])
    }
    return acc.concat([station[idx - 1], station[idx + 1]])
  }, [])
  s.adjacencies = Array.from(new Set(allAdjacencies)).reduce(
    (acc, adj) =>
      Object.assign(acc, {
        [adj]: {
          distance: geoDistance(
            [s.lon, s.lat],
            [bartStationMap[adj].lon, bartStationMap[adj].lat]
          ),
          bearing: getBearing(
            [s.lon, s.lat],
            [bartStationMap[adj].lon, bartStationMap[adj].lat]
          ),
        },
      }),
    {}
  )
})
console.log(bartStations)

const userLocationSelector = state => state.userLocation

export const distanceToStationsSelector = createSelector(
  userLocationSelector,
  userLocation => {
    if (userLocation.isFetching) {
      return { isFetching: true }
    }
    const {
      coords: { latitude: lat, longitude: lon },
      timestamp,
    } = userLocation.position

    const distanceToStations = bartStations.map(s =>
      Object.assign({}, s, {
        distance: geoDistance([s.lon, s.lat], [lon, lat]),
        bearing: getBearing([s.lon, s.lat], [lon, lat]),
      })
    )

    return {
      isFetching: false,
      distanceToStations,
      timestamp,
    }
  }
)

export const closestStationSelector = createSelector(
  distanceToStationsSelector,
  distanceToStations => {
    if (distanceToStations.isFetching) {
      return { isFetching: true }
    }
    const closestDistance = min(
      distanceToStations.distanceToStations,
      s => s.distance
    )
    const closestStation = distanceToStations.find(
      ({ distance }) => distance === closestDistance
    )

    return {
      isFetching: false,
      closestStation,
    }
  }
)
