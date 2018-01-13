import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { HashRouter as Router, Route } from "react-router-dom"
import moment from "moment"

import "./index.css"
import Store from "./store"
import Trip from "./components/trip"
import TransferMagic from "./components/transfer-magic"

import registerServiceWorker from "./registerServiceWorker"

moment.updateLocale("en", {
  relativeTime: {
    s: "%d seconds",
  },
})

const StoreInstance = Store()

ReactDOM.render(
  <Provider store={StoreInstance}>
    <Router>
      <div className="App">
        <Route exact path="/" component={Trip} />
        <Route exact path="/transfer-magic" component={TransferMagic} />
      </div>
    </Router>
  </Provider>,
  document.getElementById("root")
)
registerServiceWorker()
