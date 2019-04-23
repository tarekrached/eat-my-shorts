export const bartApiKey = "MW9S-E7SL-26DU-VV8V&"
export const bartApiRoot = window.location.protocol + "//api.bart.gov/api/"

export const bartStationETDsUrl = (station, dir = null) =>
  `${bartApiRoot}etd.aspx?cmd=etd&orig=${station}${
    dir ? "&dir=" + dir[0].toLowerCase() : ""
  }&key=${bartApiKey}&json=y`

export const bartAdvisoriesUrl = `${bartApiRoot}bsa.aspx?cmd=bsa&key=${bartApiKey}&json=y`

export const checkFetchStatus = response => {
  if (response.status >= 200 && response.status < 300) {
    return response
  }
  const error = new Error(response.statusText)
  error.response = response
  throw error
}

export const stationsHome = [
  ["24th Mission", 32, "24TH"],
  ["16th Mission", 30, "16TH"],
  ["Civic Center", 28, "CIVC"],
  ["Powell", 26, "POWL"],
  ["Montgomery", 25, "MONT"],
  ["Embarcadero", 23, "EMBR"],
  ["West Oakland", 16, "WOAK"],
  ["12th", 13, "12TH"],
  ["19th", 11, "19TH"],
  ["MacArthur", 8, "MCAR"],
  ["Ashby", 5, "ASHB"],
  ["Berkeley", 2, "DBRK"],
  ["North Berkeley", 0, "NBRK"],
]

export const radians = n => n * (Math.PI / 180)

export const degrees = n => n * (180 / Math.PI)

export const getBearing = ([startLong, startLat], [endLong, endLat]) => {
  startLat = radians(startLat)
  startLong = radians(startLong)
  endLat = radians(endLat)
  endLong = radians(endLong)

  var dLong = endLong - startLong

  var dPhi = Math.log(
    Math.tan(endLat / 2.0 + Math.PI / 4.0) /
      Math.tan(startLat / 2.0 + Math.PI / 4.0)
  )
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong)
    else dLong = 2.0 * Math.PI + dLong
  }

  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0
}

export const settingsPresets = [
  {
    preset: "home2Work",
    currentBartStation: "NBRK",
    bartDestination: "MONT",
    bartMinutes: 25,
    bartDirection: "South",
    walkingMinutes: 5,
  },
  {
    preset: "work2Home",
    currentBartStation: "MONT",
    bartDestination: "NBRK",
    bartMinutes: 25,
    bartDirection: "North",
    trainColors: ["RED", "YELLOW"],
    walkingMinutes: 9,
  },
]
