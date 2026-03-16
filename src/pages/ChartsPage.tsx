import { useEffect, useState } from 'react'
import { ChartRow, apiListCharts, apiDeleteChart } from '../api/charts'
import { apiListDatasets, DatasetRow } from '../api/datasets'
import { ChartDialog, ChartInitialValues } from '../components/ChartDialog'

export function ChartsPage() {
  const [charts, setCharts] = useState<ChartRow[]>([])
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChart, setEditingChart] = useState<ChartInitialValues | null>(null)

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

  function handleOpen(chart: ChartRow) {
    const accepted = chart.versions.find(v => v.accepted)
    setEditingChart({
      id: chart.id,
      name: chart.name,
      datasource_id: chart.datasource_id,
      d3_code: accepted?.d3_code ?? chart.versions[chart.versions.length - 1]?.d3_code ?? '',
      versions: chart.versions,
    })
    setDialogOpen(true)
  }

  function handleSaved(chart: ChartRow) {
    setCharts(prev => {
      const idx = prev.findIndex(c => c.id === chart.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = chart
        return next
      }
      return [...prev, chart]
    })
    setDialogOpen(false)
    setEditingChart(null)
  }

  return (
    <main>
      <div className="page-header">
        <h1>Charts</h1>
        <button className="btn-primary" onClick={() => { setEditingChart(null); setDialogOpen(true) }}>New chart</button>
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
                    <button className="btn-secondary" onClick={() => handleOpen(chart)}>Open</button>
                    <button className="btn-danger" onClick={() => handleDelete(chart.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ChartDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingChart(null) }}
        onSaved={handleSaved}
        initialValues={editingChart ?? undefined}
      />
    </main>
  )
}
