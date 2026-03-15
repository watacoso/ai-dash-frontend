import { LogEntry } from '../api/explore'

interface Props {
  open: boolean
  logs: LogEntry[]
  onClear: () => void
}

export function DebugPanel({ open, logs, onClear }: Props) {
  if (!open) return null

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <span className="debug-panel__title">Debug logs</span>
        <button className="btn-secondary" onClick={onClear}>Clear</button>
      </div>
      <div className="debug-panel__body">
        {logs.length === 0 ? (
          <p className="debug-panel__empty">No logs yet.</p>
        ) : (
          <ul className="debug-panel__list">
            {logs.map((entry, i) => (
              <li key={i} className="debug-entry" data-level={entry.level}>
                <span className="debug-entry__level">{entry.level}</span>
                <span className="debug-entry__message">{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
