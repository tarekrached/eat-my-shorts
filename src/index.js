import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import "./index.css"
import Store from "./store"
import App from "./components/App"
import registerServiceWorker from "./registerServiceWorker"

const StoreInstance = Store()

ReactDOM.render(
  <Provider store={StoreInstance}>
    <App />
  </Provider>,
  document.getElementById("root")
)
registerServiceWorker()
