const fs = require("fs")
const axios = require("axios")

const routesFn = "./src/data/bart-routes.json"
const stationsFn = "./src/data/bart-stations.json"

const routeUrl = id =>
  `https://api.bart.gov/api/route.aspx?cmd=routeinfo&route=${id}&key=MW9S-E7SL-26DU-VV8V&json=y`

axios
  .get(
    "https://api.bart.gov/api/route.aspx?cmd=routeinfo&route=all&key=MW9S-E7SL-26DU-VV8V&json=y"
  )
  .then(async ({ data: { root: { routes: { route: routes } } } }) => {
    console.log(`writing ${routes.length} routes to ${routesFn}`)
    fs.writeFileSync(routesFn, JSON.stringify(routes), "utf8")
  })

axios
  .get(
    "https://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V&json=y"
  )
  .then(({ data: { root: { stations: { station: stations } } } }) => {
    console.log(`writing ${stations.length} stations to ${stationsFn}`)
    fs.writeFileSync(stationsFn, JSON.stringify(stations), "utf8")
  })
