import React, { Component } from "react"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import { fetchStationETDs } from "../actions"
import { transferMagicSelector } from "../selectors"

class App extends Component {
  state = {}

  componentWillMount() {
    this.load()
  }
  load() {
    this.props.dispatch(fetchStationETDs("12TH", "North"))
    this.props.dispatch(fetchStationETDs("19TH", "North"))
    this.props.dispatch(fetchStationETDs("MCAR", "North"))
  }
  handleReload = e => this.load()

  render() {
    const {
      transferMagicData: { isFetching, targetTrains, sourceTrains, stations },
    } = this.props
    if (isFetching) {
      return <div className="loading">loading</div>
    }
    return (
      <div className="transfer-magic">
        <div className="top-menu">
          <div />

          <Link to="/">Home</Link>
        </div>
        <div className="stations">
          {stations.map(({ station, targetTrains, sourceTrains }) => (
            <div key={station} className="station">
              <div>
                <a href={`https://www.bart.gov/schedules/eta/${station}`}>
                  {station}
                </a>
              </div>
              <div>
                source: {sourceTrains.map(t => t.intMinutes).join(", ")}
              </div>
              <div>
                target:{" "}
                {targetTrains
                  .filter(t => t.intMinutes >= sourceTrains[0].intMinutes)
                  .map(t => t.intMinutes)
                  .join(", ")}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h2>Targets:</h2>
          {targetTrains.map(({ train, stations }, i) => (
            <div key={i}>
              <div className="train">
                <span
                  className="color"
                  style={{ backgroundColor: train.hexcolor }}
                />{" "}
                {train.destination}
              </div>
              {stations.map(({ station, at, intMinutes }) => (
                <div key={station}>
                  {station} {intMinutes}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <h2>Sources:</h2>
          {sourceTrains.map(({ train, stations }, i) => (
            <div className="train" key={i}>
              <h3>
                {" "}
                <span
                  className="color"
                  style={{ backgroundColor: train.hexcolor }}
                />{" "}
                {train.destination}
              </h3>
              {stations.map(({ station, at, intMinutes }) => (
                <div key={station}>
                  {station} {intMinutes}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <Link to="/transfer-magic">Back</Link>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  transferMagicData: transferMagicSelector(state),
})

export default connect(mapStateToProps)(App)
