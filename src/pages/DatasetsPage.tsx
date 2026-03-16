import { useEffect, useState } from 'react'
import { DatasetDialog } from '../components/DatasetDialog'
import { DatasetRow, apiDeleteDataset, apiListDatasets } from '../api/datasets'

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    apiListDatasets()
      .then(setDatasets)
      .catch(() => setError('Failed to load datasets.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    await apiDeleteDataset(id)
    setDatasets((prev) => prev.filter((ds) => ds.id !== id))
  }

  return (
    <main>
      <div className="datasets-header">
        <h1>Datasets</h1>
        <button onClick={() => setDialogOpen(true)}>Add dataset</button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p role="alert" className="error-text">{error}</p>}

      {!loading && !error && datasets.length === 0 && (
        <p className="empty-state">No datasets yet. Create one to get started.</p>
      )}

      {!loading && !error && datasets.length > 0 && (
        <table className="datasets-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((ds) => (
              <tr key={ds.id}>
                <td>{ds.name}</td>
                <td>{ds.description}</td>
                <td>{new Date(ds.created_at).toLocaleString()}</td>
                <td className="datasets-actions">
                  <button>Open</button>
                  <button onClick={() => handleDelete(ds.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <DatasetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(ds) => {
          setDatasets(prev => [...prev, ds])
          setDialogOpen(false)
        }}
      />
    </main>
  )
}
