import { createStore, applyMiddleware } from "redux"
import { routerMiddleware } from "react-router-redux"
import thunkMiddleware from "redux-thunk"

import reducers from "./reducers"

export default function configureStore(history, initialState) {
  const create = window.devToolsExtension
    ? window.devToolsExtension()(createStore)
    : createStore

  const createStoreWithMiddleware = applyMiddleware(
    thunkMiddleware,
    routerMiddleware(history)
  )(create)

  const store = createStoreWithMiddleware(reducers, initialState)

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept("./reducers", () => {
      const nextReducers = require("./reducers/index")
      store.replaceReducer(nextReducers)
    })
  }
  return store
}
