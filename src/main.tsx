import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import './index.css'
import { store } from './store'
import { refreshGtfsStatic } from './store/gtfsRtSlice'
import { isStale } from './services/gtfs-static'
import Trip from './components/Trip'
import TransferMagic from './components/TransferMagic'
import InlinePreview from './components/InlinePreview'
import Settings from './components/Settings'

// Configure dayjs
dayjs.extend(relativeTime)

// Eagerly fetch GTFS static data on launch if it is missing or stale.
// The cached copy stays in place while this runs, and survives a failed
// refresh, so an offline launch still renders with whatever we last had.
const cachedStatic = store.getState().gtfsRt.gtfsStatic
if (!cachedStatic || isStale(cachedStatic)) {
  store.dispatch(refreshGtfsStatic())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Trip />} />
            <Route path="/transfer-magic" element={<TransferMagic />} />
            <Route path="/inline" element={<InlinePreview />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  </React.StrictMode>
)
