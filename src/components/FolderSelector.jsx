import React, { useEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'
import { loadScoresFromFiles } from '../utils/fileUtils'
import {
  DRIVE_SETUP_MESSAGE,
  isGoogleDriveConfigured,
  loadScoreFilesFromDrive,
  preloadGoogleDrive,
  requestDriveAccess
} from '../utils/googleDrive'
import './FolderSelector.css'

const ACCEPTED_FILES = 'image/jpeg,image/jpg,image/png,image/webp,.json,application/json'

const reportRejected = (rejected) => {
  if (rejected.length === 0) return
  alert(`Alcuni file EasyScore non sono stati caricati:\n\n${rejected.join('\n')}`)
}

const FolderSelector = () => {
  const { setScores, setSelectedFolder, scores } = useStore()
  const folderInputRef = useRef(null)
  const filesInputRef = useRef(null)
  const [driveBusy, setDriveBusy] = useState(false)
  const [driveReady, setDriveReady] = useState(!isGoogleDriveConfigured())

  useEffect(() => {
    if (!isGoogleDriveConfigured()) return undefined
    let cancelled = false
    preloadGoogleDrive()
      .then(() => {
        if (!cancelled) setDriveReady(true)
      })
      .catch((error) => {
        console.error('Google Drive preload:', error)
        if (!cancelled) setDriveReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const resetInput = (ref) => {
    if (ref.current) ref.current.value = ''
  }

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files)
    resetInput(folderInputRef) // permette di selezionare di nuovo la stessa cartella
    if (files.length === 0) return

    try {
      const { scores: newScores, rejected } = await loadScoresFromFiles(files)
      reportRejected(rejected)

      if (newScores.length === 0) {
        alert('Nessuna immagine o file EasyScore (.json) trovato nella cartella.')
        return
      }

      // Se ci sono già spartiti, chiedi conferma per sostituirli
      if (scores.length > 0) {
        const confirmReplace = window.confirm(
          `Vuoi sostituire i ${scores.length} spartiti esistenti con i ${newScores.length} nuovi?`
        )
        if (!confirmReplace) return
      }

      setScores(newScores)
      setSelectedFolder(files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Cartella selezionata')
    } catch (error) {
      console.error('Error loading files:', error)
      alert('Errore nel caricamento dei file. Assicurati di aver selezionato immagini o file EasyScore validi.')
    }
  }

  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files)
    resetInput(filesInputRef)
    if (files.length === 0) return

    try {
      const { scores: newScores, rejected } = await loadScoresFromFiles(files)
      reportRejected(rejected)
      if (newScores.length === 0) {
        if (rejected.length === 0) alert('Nessuna immagine o file EasyScore valido selezionato.')
        return
      }
      // Aggiunge in coda alla scaletta corrente
      setScores([...scores, ...newScores])
    } catch (error) {
      console.error('Error loading files:', error)
      alert('Errore nel caricamento dei file.')
    }
  }

  const handleDrive = () => {
    if (driveBusy) return
    if (!isGoogleDriveConfigured()) {
      alert(DRIVE_SETUP_MESSAGE)
      return
    }
    if (!driveReady) return

    setDriveBusy(true)
    requestDriveAccess()
      .then(async (token) => {
        if (!token) return null
        return loadScoreFilesFromDrive(token)
      })
      .then(async (loaded) => {
        if (!loaded) return
        reportRejected(loaded.rejected)
        const { scores: newScores, rejected } = await loadScoresFromFiles(loaded.files)
        reportRejected(rejected)

        if (newScores.length === 0) {
          if (loaded.rejected.length === 0 && rejected.length === 0) {
            alert('Nessuna immagine o file EasyScore trovato su Drive.')
          }
          return
        }

        const currentScores = useStore.getState().scores
        if (currentScores.length > 0) {
          const confirmReplace = window.confirm(
            `Vuoi sostituire i ${currentScores.length} spartiti esistenti con i ${newScores.length} da Drive?`
          )
          if (!confirmReplace) return
        }

        setScores(newScores)
        setSelectedFolder('Google Drive')
      })
      .catch((error) => {
        console.error('Error loading Google Drive:', error)
        alert(error.message || 'Errore nel caricamento da Google Drive.')
      })
      .finally(() => setDriveBusy(false))
  }

  return (
    <div className="folder-selector">
      <div className="folder-selector-content">
        <h1>🎵 EasyScore</h1>
        <p className="subtitle">Teleprompter Musicale</p>

        <div className="folder-input-wrapper">
          <div className="folder-actions">
            <input
              ref={folderInputRef}
              type="file"
              id="folder-input"
              webkitdirectory=""
              directory=""
              multiple
              accept={ACCEPTED_FILES}
              onChange={handleFolderSelect}
              className="folder-input"
            />
            <label htmlFor="folder-input" className="folder-label">
              📁 Seleziona Cartella Spartiti
            </label>

            <input
              ref={filesInputRef}
              type="file"
              id="files-input"
              multiple
              accept={ACCEPTED_FILES}
              onChange={handleFilesSelect}
              className="folder-input"
            />
            <label htmlFor="files-input" className="folder-label folder-label-secondary">
              📄 Aggiungi file
            </label>

            <button
              type="button"
              className="folder-label folder-label-secondary"
              onClick={handleDrive}
              disabled={driveBusy || (isGoogleDriveConfigured() && !driveReady)}
            >
              {driveBusy ? 'Download da Drive…' : 'Drive'}
            </button>
          </div>
          <p className="folder-hint">Immagini (JPG, PNG, WebP) o spartiti EasyScore (.json), dal computer o da Google Drive</p>
        </div>

        {scores.length > 0 && (
          <div className="folder-info">
            <p>✅ {scores.length} spartiti caricati</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FolderSelector
