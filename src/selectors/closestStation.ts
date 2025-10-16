import { createSelector } from 'reselect'
import { geoDistance } from 'd3-geo'
import { min } from 'd3-array'

import { getBearing } from '../utilities'
import rawBartStations from '../data/bart-stations.json'
import bartRoutes from '../data/bart-routes.json'
import type { RootState, BartStation, BartRoute } from '../types'

interface EnrichedBartStation extends BartStation {
  lat: number
  lon: number
  adjacencies?: Record<string, { distance: number; bearing: number }>
}

const bartStations: EnrichedBartStation[] = (rawBartStations as BartStation[]).map((s) => ({
  ...s,
  lat: parseFloat(s.gtfs_latitude),
  lon: parseFloat(s.gtfs_longitude),
}))

const bartStationMap = bartStations.reduce(
  (acc, s) => ({ ...acc, [s.abbr]: s }),
  {} as Record<string, EnrichedBartStation>
)

// Build adjacency graph
bartStations.forEach((s) => {
  const abbr = s.abbr
  const allAdjacencies = (bartRoutes as BartRoute[]).reduce((acc, { config: { station } }) => {
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
  }, [] as string[])

  s.adjacencies = Array.from(new Set(allAdjacencies)).reduce(
    (acc, adj) => ({
      ...acc,
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

const userLocationSelector = (state: RootState) => state.userLocation

interface StationWithDistance extends EnrichedBartStation {
  distance: number
  bearing: number
}

export const distanceToStationsSelector = createSelector(
  [userLocationSelector],
  (userLocation) => {
    if (userLocation.isFetching || !userLocation.position) {
      return { isFetching: true, distanceToStations: [], timestamp: 0 }
    }

    const {
      coords: { latitude: lat, longitude: lon },
      timestamp,
    } = userLocation.position

    const distanceToStations: StationWithDistance[] = bartStations.map((s) => ({
      ...s,
      distance: geoDistance([s.lon, s.lat], [lon, lat]),
      bearing: getBearing([s.lon, s.lat], [lon, lat]),
    }))

    return {
      isFetching: false,
      distanceToStations,
      timestamp,
    }
  }
)

export const closestStationSelector = createSelector(
  [distanceToStationsSelector],
  (distanceToStations) => {
    if (distanceToStations.isFetching) {
      return { isFetching: true, closestStation: null }
    }

    const closestDistance = min(
      distanceToStations.distanceToStations,
      (s) => s.distance
    )

    const closestStation = distanceToStations.distanceToStations.find(
      ({ distance }) => distance === closestDistance
    )

    return {
      isFetching: false,
      closestStation: closestStation || null,
    }
  }
)
