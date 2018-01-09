import React, { Component } from "react"
import { connect } from "react-redux"

import { fetchStationETDs } from "../actions"
import { transferMagicSelector } from "../selectors"

class App extends Component {
  state = {}

  componentWillMount() {
    this.load()
  }
  load() {
    this.props.dispatch(fetchStationETDs("12TH"))
    this.props.dispatch(fetchStationETDs("19TH"))
    this.props.dispatch(fetchStationETDs("MCAR"))
  }
  handleReload = e => this.load()

  render() {
    const { transferStations } = this.props
    console.log(transferStations)
    return <div className="transfer-magic" />
  }
}

const mapStateToProps = state => ({
  transferStations: transferMagicSelector(state),
})

export default connect(mapStateToProps)(App)
