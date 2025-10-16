import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import './index.css'
import { store } from './store'
import Trip from './components/Trip'
import TransferMagic from './components/TransferMagic'

// Configure dayjs
dayjs.extend(relativeTime)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Trip />} />
            <Route path="/transfer-magic" element={<TransferMagic />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  </React.StrictMode>
)
