import { useEffect, useState } from 'react'
import { DatasetDialog } from '../components/DatasetDialog'
import { DatasetRow, apiDeleteDataset, apiListDatasets } from '../api/datasets'

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDataset, setEditingDataset] = useState<DatasetRow | null>(null)

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

  function handleOpen(ds: DatasetRow) {
    setEditingDataset(ds)
    setDialogOpen(true)
  }

  function handleClose() {
    setDialogOpen(false)
    setEditingDataset(null)
  }

  function handleSaved(ds: DatasetRow) {
    setDatasets((prev) => {
      const idx = prev.findIndex((d) => d.id === ds.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = ds
        return next
      }
      return [...prev, ds]
    })
    handleClose()
  }

  return (
    <main>
      <div className="page-header">
        <h1>Datasets</h1>
        <button className="btn-primary" onClick={() => { setEditingDataset(null); setDialogOpen(true) }}>Add dataset</button>
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
                  <button className="btn-secondary" onClick={() => handleOpen(ds)}>Open</button>
                  <button className="btn-danger" onClick={() => handleDelete(ds.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <DatasetDialog
        open={dialogOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        initialValues={editingDataset ? {
          id: editingDataset.id,
          name: editingDataset.name,
          description: editingDataset.description,
          sql: editingDataset.sql,
          snowflake_connection_id: editingDataset.snowflake_connection_id,
          claude_connection_id: editingDataset.claude_connection_id,
          models_used: editingDataset.models_used,
        } : undefined}
      />
    </main>
  )
}
