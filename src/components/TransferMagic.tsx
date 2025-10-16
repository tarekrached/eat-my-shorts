import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { fetchStationETDs } from '../store/stationETDsSlice'
import { transferMagicSelector } from '../selectors'
import type { AppDispatch } from '../store'

function TransferMagic() {
  const dispatch = useDispatch<AppDispatch>()
  const transferMagicData = useSelector(transferMagicSelector)

  const load = () => {
    dispatch(fetchStationETDs({ station: '12TH', dir: 'North' }))
    dispatch(fetchStationETDs({ station: '19TH', dir: 'North' }))
    dispatch(fetchStationETDs({ station: 'MCAR', dir: 'North' }))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { isFetching, targetTrains, sourceTrains, stations } = transferMagicData

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
              source: {sourceTrains.map((t) => t.intMinutes).join(', ')}
            </div>
            <div>
              target:{' '}
              {targetTrains
                .filter((t) => t.intMinutes >= sourceTrains[0]?.intMinutes)
                .map((t) => t.intMinutes)
                .join(', ')}
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
              />{' '}
              {train.destination}
            </div>
            {stations.map(({ station, intMinutes }) => (
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
              {' '}
              <span
                className="color"
                style={{ backgroundColor: train.hexcolor }}
              />{' '}
              {train.destination}
            </h3>
            {stations.map(({ station, intMinutes }) => (
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

export default TransferMagic
