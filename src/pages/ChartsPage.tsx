import { useEffect, useState } from 'react'
import { ChartRow, apiListCharts, apiDeleteChart } from '../api/charts'
import { apiListDatasets, DatasetRow } from '../api/datasets'

export function ChartsPage() {
  const [charts, setCharts] = useState<ChartRow[]>([])
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([apiListCharts(), apiListDatasets()])
      .then(([c, d]) => { setCharts(c); setDatasets(d) })
      .catch(() => setError('Failed to load charts.'))
      .finally(() => setLoading(false))
  }, [])

  function datasourceName(id: string) {
    return datasets.find(d => d.id === id)?.name ?? id
  }

  async function handleDelete(id: string) {
    await apiDeleteChart(id)
    setCharts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <main>
      <div className="page-header">
        <h1>Charts</h1>
        <button className="btn-primary">New chart</button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p role="alert" className="error-text">{error}</p>}

      {!loading && !error && charts.length === 0 && (
        <p className="empty-state">No charts yet. Create one to get started.</p>
      )}

      {!loading && !error && charts.length > 0 && (
        <table className="charts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Datasource</th>
              <th>Created at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {charts.map(chart => (
              <tr key={chart.id}>
                <td>{chart.name}</td>
                <td>{datasourceName(chart.datasource_id)}</td>
                <td>{new Date(chart.created_at).toLocaleString()}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn-secondary">Open</button>
                    <button className="btn-danger" onClick={() => handleDelete(chart.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
