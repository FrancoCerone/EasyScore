import React, { useEffect, useState } from 'react'
import { isDriveFolder, listDriveFolder } from '../utils/googleDrive'
import './DriveBrowser.css'

const ROOT = { id: 'root', name: 'Il mio Drive' }

const DriveBrowser = ({ token, onCancel, onConfirm }) => {
  const [stack, setStack] = useState([ROOT])
  const [entries, setEntries] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const current = stack[stack.length - 1]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setSelectedIds(new Set())
    listDriveFolder(current.id, token)
      .then((files) => {
        if (!cancelled) setEntries(files)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Impossibile leggere la cartella.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [current.id, token])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const openFolder = (folder) => {
    setStack((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const toggleFile = (file) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(file.id)) next.delete(file.id)
      else next.add(file.id)
      return next
    })
  }

  const selectedFiles = entries.filter((entry) => selectedIds.has(entry.id))

  return (
    <div className="drive-browser" role="dialog" aria-modal="true" aria-labelledby="drive-browser-title">
      <div className="drive-browser-panel">
        <header className="drive-browser-header">
          <h2 id="drive-browser-title">Google Drive</h2>
          <button type="button" className="drive-browser-close" onClick={onCancel} aria-label="Chiudi">
            ×
          </button>
        </header>

        <nav className="drive-browser-path" aria-label="Percorso">
          {stack.map((folder, index) => (
            <span key={folder.id} className="drive-browser-crumb">
              {index > 0 && <span className="drive-browser-sep">/</span>}
              <button
                type="button"
                onClick={() => setStack(stack.slice(0, index + 1))}
                disabled={index === stack.length - 1}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="drive-browser-list">
          {loading && <p className="drive-browser-status">Lettura della cartella…</p>}
          {!loading && error && <p className="drive-browser-status drive-browser-error">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="drive-browser-status">Nessuna cartella o spartito qui.</p>
          )}
          {!loading && !error && entries.map((entry) => {
            const folder = isDriveFolder(entry)
            return (
              <div key={entry.id} className="drive-browser-row">
                {folder ? (
                  <button type="button" className="drive-browser-open" onClick={() => openFolder(entry)}>
                    <span aria-hidden="true">📁</span>
                    <span>{entry.name}</span>
                  </button>
                ) : (
                  <label className="drive-browser-file">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleFile(entry)}
                    />
                    <span>{entry.name}</span>
                  </label>
                )}
              </div>
            )
          })}
        </div>

        <footer className="drive-browser-footer">
          <button type="button" className="drive-browser-btn" onClick={onCancel}>
            Annulla
          </button>
          <button
            type="button"
            className="drive-browser-btn"
            onClick={() => onConfirm([current.mimeType ? current : { ...current, mimeType: 'application/vnd.google-apps.folder' }])}
            disabled={loading || Boolean(error)}
          >
            Importa cartella
          </button>
          <button
            type="button"
            className="drive-browser-btn drive-browser-btn-primary"
            onClick={() => onConfirm(selectedFiles)}
            disabled={selectedFiles.length === 0}
          >
            Importa selezionati
          </button>
        </footer>
      </div>
    </div>
  )
}

export default DriveBrowser
