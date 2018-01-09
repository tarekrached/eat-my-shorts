import React, { Component } from "react"
import { connect } from "react-redux"

import { fetchStationETDs, fetchBartAdvisories } from "../actions"
import { currentStationEtdsSelector } from "../selectors"
import { stationsHome } from "../utilities"
import TransferMagic from "./transfer-magic"

class App extends Component {
  state = {}

  componentWillMount() {
    this.load()
  }
  load() {
    this.props.dispatch(
      fetchStationETDs(this.props.settings.currentBartStation)
    )
    this.props.dispatch(fetchBartAdvisories())
  }
  handleReload = e => this.load()

  render() {
    const {
      settings: { currentBartStation, walkingMinutes, trainTime },
      stationETDs,
      bartAdvisories,
    } = this.props

    return (
      <div className="App">
        <div className="bart-trains">
          {stationETDs.isFetching && (
            <span className="loading">loading {currentBartStation} trains</span>
          )}
          {!stationETDs.isFetching && (
            <span className="loading">
              {currentBartStation} as of {stationETDs.at.format("s")} seconds
              ago
            </span>
          )}

          {stationETDs.trains && (
            <div id="bart-trains">
              {stationETDs.trains.map(
                (
                  {
                    minutes,
                    platform,
                    direction,
                    length,
                    color,
                    hexcolor,
                    bikeflag,
                    delay,
                    destination,
                    abbreviation,
                    limited,
                    at,
                    etd,
                  },
                  i
                ) => (
                  <div className="train" key={i}>
                    <span
                      className="color"
                      style={{ backgroundColor: hexcolor }}
                    />{" "}
                    <span className="minutes">{at.fromNow(true)}</span>{" "}
                    <span className="destination">{destination}</span>{" "}
                    <span className="length">{length} car</span>{" "}
                    <span className="home-time">{etd.format("h:mm a")}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
        <div id="bart-advisories">
          <a href="http://m.bart.gov/schedules/advisories">BART Advisories</a>:{" "}
          {bartAdvisories.isFetching && (
            <span className="loading">loading advisories</span>
          )}
          {bartAdvisories.bartAdvisories && (
            <span id="bart-advisory-list">
              {bartAdvisories.bartAdvisories.map((adv, i) => (
                <span key={i}>{adv}</span>
              ))}
            </span>
          )}
        </div>
        <button id="reload" onClick={this.handleReload}>
          Reload
        </button>
        <p id="estimate-info">
          Arrival estimates include {trainTime} minutes on train and{" "}
          {walkingMinutes} minutes on foot.
        </p>
        <div id="en-route-times">
          <ul id="bart-station-times">
            {stationsHome.map(([name, mins, abbr]) => (
              <li key={abbr}>
                <a href={`https://m.bart.gov/schedules/eta?stn=${abbr}`}>
                  {name}
                </a>: {mins} mins
              </li>
            ))}
          </ul>
        </div>
        {/* <TransferMagic /> */}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  settings: state.settings,
  stationETDs: currentStationEtdsSelector(state),
  bartAdvisories: state.bartAdvisories,
})

export default connect(mapStateToProps)(App)
