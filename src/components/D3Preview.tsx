import { useEffect, useRef, useState } from 'react'

interface Props {
  d3Code: string
}

const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js'

function buildSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; overflow: hidden; }</style>
  <script src="${D3_CDN}"><\/script>
</head>
<body>
<script>
(function() {
  try {
    ${code}
  } catch (e) {
    window.parent.postMessage({ type: 'd3-error', message: e.message || String(e) }, '*');
  }
})();
<\/script>
</body>
</html>`
}

export function D3Preview({ d3Code }: Props) {
  const [srcdoc, setSrcdoc] = useState(() => d3Code ? buildSrcdoc(d3Code) : '')
  const [renderError, setRenderError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce srcdoc updates on code changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!d3Code) {
      setSrcdoc('')
      setRenderError(null)
      return
    }
    setRenderError(null)
    debounceRef.current = setTimeout(() => {
      setSrcdoc(buildSrcdoc(d3Code))
    }, 600)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [d3Code])

  // Listen for runtime errors posted from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'd3-error') {
        setRenderError(e.data.message)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!d3Code) {
    return (
      <div className="d3-preview-placeholder">
        <span>No preview — add D3 code to see a live render.</span>
      </div>
    )
  }

  return (
    <div className="d3-preview">
      {renderError && (
        <p role="alert" className="d3-preview-error">Render error: {renderError}</p>
      )}
      <iframe
        className="d3-preview-frame"
        sandbox="allow-scripts"
        srcDoc={srcdoc}
        title="D3 preview"
      />
    </div>
  )
}
