export const bartApiKey = "MW9S-E7SL-26DU-VV8V&"
export const bartApiRoot = "http://api.bart.gov/api/"

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
