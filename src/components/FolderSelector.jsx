import React, { useRef } from 'react'
import useStore from '../store/useStore'
import { loadImagesFromFiles } from '../utils/fileUtils'
import './FolderSelector.css'

const FolderSelector = () => {
  const { setScores, setSelectedFolder, scores } = useStore()
  const fileInputRef = useRef(null)

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    try {
      const newScores = await loadImagesFromFiles(files)
      
      // Se ci sono già spartiti, chiedi conferma per sostituirli
      if (scores.length > 0) {
        const confirmReplace = window.confirm(
          `Vuoi sostituire i ${scores.length} spartiti esistenti con i ${newScores.length} nuovi?`
        )
        if (!confirmReplace) return
      }

      setScores(newScores)
      setSelectedFolder(files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Cartella selezionata')
      
      // Reset input per permettere di selezionare la stessa cartella
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error loading images:', error)
      alert('Errore nel caricamento delle immagini. Assicurati di aver selezionato file immagine validi.')
    }
  }

  return (
    <div className="folder-selector">
      <div className="folder-selector-content">
        <h1>🎵 EasyScore</h1>
        <p className="subtitle">Teleprompter Musicale</p>
        
        <div className="folder-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            id="folder-input"
            webkitdirectory=""
            directory=""
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFolderSelect}
            className="folder-input"
          />
          <label htmlFor="folder-input" className="folder-label">
            📁 Seleziona Cartella Spartiti
          </label>
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

