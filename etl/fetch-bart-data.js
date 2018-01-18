const fs = require("fs")
const fetch = require("isomorphic-fetch")

const routesFn = "./src/data/bart-routes.json"
const stationsFn = "./src/data/bart-stations.json"

const routeUrl = id =>
  `https://api.bart.gov/api/route.aspx?cmd=routeinfo&route=${id}&key=MW9S-E7SL-26DU-VV8V&json=y`

fetch(
  "https://api.bart.gov/api/route.aspx?cmd=routes&key=MW9S-E7SL-26DU-VV8V&json=y"
)
  .then(res => res.json())
  .then(({ root: { routes: { route: routes } } }) => {
    console.log(`found ${routes.length} routes, fetching each route`)
    Promise.all(
      routes.map(({ number }) =>
        fetch(routeUrl(number))
          .then(res => res.json())
          .then(({ root: { routes: { route } } }) => Promise.resolve(route))
      )
    ).then(routes => {
      console.log(`writing ${routes.length} routes to ${routesFn}`)
      fs.writeFileSync(routesFn, JSON.stringify(routes), "utf8")
    })
  })

fetch(
  "https://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V&json=y"
)
  .then(res => res.json())
  .then(({ root: { stations: { station: stations } } }) => {
    console.log(`writing ${stations.length} stations to ${stationsFn}`)
    fs.writeFileSync(stationsFn, JSON.stringify(stations), "utf8")
  })
