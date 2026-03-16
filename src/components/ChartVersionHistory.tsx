import { ChartVersion } from '../api/charts'

interface Props {
  versions: ChartVersion[]
  onAccept: (index: number) => void
  onPreview: (d3Code: string) => void
}

export function ChartVersionHistory({ versions, onAccept, onPreview }: Props) {
  if (versions.length === 0) {
    return <p className="empty-state">No versions yet. Ask the AI to generate D3 code.</p>
  }

  return (
    <div className="chart-version-history">
      {versions.map((v) => (
        <div
          key={v.version}
          className={`chart-version-row${v.accepted ? ' chart-version-row--accepted' : ''}`}
        >
          <button
            className="chart-version-label"
            onClick={() => onPreview(v.d3_code)}
          >
            v{v.version}
            <span className="chart-version-time">
              {new Date(v.created_at).toLocaleString()}
            </span>
            {v.accepted && <span className="chart-version-badge">Accepted</span>}
          </button>
          {!v.accepted && (
            <button
              className="btn-secondary"
              onClick={() => onAccept(v.version)}
            >
              Accept
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
