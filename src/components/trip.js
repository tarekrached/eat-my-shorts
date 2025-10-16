import React, { Component } from "react"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import {
  fetchStationETDs,
  fetchBartAdvisories,
  updateSettings,
} from "../actions"
import { currentStationEtdsSelector } from "../selectors"
import { stationsHome, settingsPresets } from "../utilities"

class Trip extends Component {
  state = {
    timer: null,
    counter: 0,
  }

  componentDidMount() {
    this.load()
    this.setState({ timer: setInterval(this.tick, 3000) })
  }

  componentWillUnmount() {
    clearInterval(this.state.timer)
  }

  load() {
    this.props.dispatch(
      fetchStationETDs(
        this.props.settings.currentBartStation,
        this.props.settings.bartDirection
      )
    )
    this.props.dispatch(fetchBartAdvisories())
  }

  handleReload = e => this.load()

  tick = () => {
    this.setState({
      counter: this.state.counter + 1,
    })
  }
  switchPreset = () => {
    const newSettings = settingsPresets.find(
      d => d.preset !== this.props.settings.preset
    )

    this.props.dispatch(updateSettings(newSettings))
    this.props.dispatch(
      fetchStationETDs(
        newSettings.currentBartStation,
        newSettings.bartDirection
      )
    )
  }

  render() {
    const {
      settings: {
        preset,
        currentBartStation,
        bartDirection,
        walkingMinutes,
        bartMinutes,
      },
      stationETDs,
      bartAdvisories,
    } = this.props

    return (
      <div className="bart-home">
        <div className="top-menu">
          <div>
            preset: {preset} <button onClick={this.switchPreset}>switch</button>
          </div>

          <Link to="/transfer-magic">Transfer!</Link>
        </div>
        <div className="bart-trains">
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
        <div className="data-freshness">
          {stationETDs.isFetching && (
            <span className="loading">
              loading {currentBartStation} {bartDirection} trains
            </span>
          )}
          {!stationETDs.isFetching && (
            <span className="status">
              {currentBartStation} {bartDirection} trains{" "}
              {stationETDs.at.fromNow()}
            </span>
          )}
          <button onClick={this.handleReload}>Reload</button>
        </div>
        <div id="en-route-times">
          <ul id="bart-station-times">
            {stationsHome.map(([name, mins, abbr]) => (
              <li key={abbr}>
                <a href={`https://www.bart.gov/schedules/eta/${abbr}`}>
                  {name}
                </a>
                : {mins} mins
              </li>
            ))}
          </ul>
        </div>
        <p id="estimate-info">
          Arrival estimates include {bartMinutes} minutes on train and{" "}
          {walkingMinutes} minutes on foot.
        </p>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  settings: state.settings,
  stationETDs: currentStationEtdsSelector(state),
  bartAdvisories: state.bartAdvisories,
})

export default connect(mapStateToProps)(Trip)
