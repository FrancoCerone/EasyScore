import React, { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import useStore from '../store/useStore'
import { exportToJSON, importFromJSON } from '../utils/fileUtils'
import './ScoreList.css'

// StrictModeDroppable wrapper per React 18
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}

const ScoreList = () => {
  const { scores, updateScore, reorderScores, setIsPerformanceMode, setCurrentScoreIndex, setScores } = useStore()
  const [editingBPM, setEditingBPM] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(scores)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    reorderScores(items)
  }

  const handleBPMChange = (id, bpm) => {
    const bpmValue = parseInt(bpm) || 60
    const clampedBPM = Math.max(30, Math.min(300, bpmValue))
    updateScore(id, { bpm: clampedBPM })
    setEditingBPM(null)
  }

  const handlePlay = () => {
    if (scores.length === 0) {
      alert('Aggiungi almeno uno spartito per iniziare la performance!')
      return
    }
    setCurrentScoreIndex(0)
    setIsPerformanceMode(true)
  }

  const handleExport = () => {
    if (scores.length === 0) {
      alert('Non ci sono spartiti da esportare!')
      return
    }
    exportToJSON(scores)
  }

  const handleImport = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const importData = await importFromJSON(file)
      
      if (!importData.scores || !Array.isArray(importData.scores)) {
        alert('File JSON non valido: formato non riconosciuto')
        return
      }

      // Verifica se il JSON contiene le immagini (versione 2.0+)
      const hasImages = importData.scores.some(score => score.base64)
      const isNewFormat = importData.version && parseFloat(importData.version) >= 2.0

      if (hasImages || isNewFormat) {
        // Nuovo formato: crea gli spartiti direttamente dal JSON
        const importedScores = importData.scores.map((importedScore, index) => {
          if (!importedScore.base64) {
            throw new Error(`Spartito "${importedScore.name}" non contiene l'immagine. File JSON incompleto.`)
          }
          
          return {
            id: importedScore.id || `${Date.now()}-${index}`,
            name: importedScore.name,
            url: importedScore.base64, // Usa base64 come url
            base64: importedScore.base64,
            bpm: importedScore.bpm || 120,
            zoom: importedScore.zoom || 100,
            order: importedScore.order !== undefined ? importedScore.order : index
          }
        })

        // Ordina per order se presente
        importedScores.sort((a, b) => a.order - b.order)

        const confirmImport = window.confirm(
          `Importazione completa!\n\n` +
          `Spartiti da importare: ${importedScores.length}\n` +
          `Il file contiene tutte le immagini, non è necessario caricare la cartella.\n\n` +
          `Vuoi sostituire la scaletta corrente con quella importata?`
        )

        if (confirmImport) {
          setScores(importedScores)
        }
      } else {
        // Formato vecchio: richiede spartiti già caricati (retrocompatibilità)
        if (scores.length === 0) {
          alert(
            'Questo file JSON è in formato vecchio e non contiene le immagini.\n\n' +
            'Per importarlo completamente, devi prima caricare gli spartiti selezionando una cartella.\n\n' +
            'Oppure esporta nuovamente il file per includere le immagini.'
          )
          return
        }

        // Crea una mappa degli spartiti esistenti per nome
        const scoresMap = new Map()
        scores.forEach(score => {
          scoresMap.set(score.name.toLowerCase(), score)
        })

        // Trova gli spartiti corrispondenti e applica i metadati
        const updatedScores = [...scores]
        const notFoundNames = []

        importData.scores.forEach((importedScore) => {
          const existingScore = scoresMap.get(importedScore.name.toLowerCase())
          if (existingScore) {
            const index = updatedScores.findIndex(s => s.id === existingScore.id)
            if (index !== -1) {
              updatedScores[index] = {
                ...updatedScores[index],
                bpm: importedScore.bpm || updatedScores[index].bpm,
                zoom: importedScore.zoom || updatedScores[index].zoom || 100
              }
            }
          } else {
            notFoundNames.push(importedScore.name)
          }
        })

        // Riordina gli spartiti secondo l'ordine nel JSON
        const orderedScores = []
        importData.scores.forEach((importedScore) => {
          const score = updatedScores.find(s => 
            s.name.toLowerCase() === importedScore.name.toLowerCase()
          )
          if (score) {
            orderedScores.push(score)
          }
        })

        // Aggiungi gli spartiti che non erano nel JSON alla fine
        updatedScores.forEach(score => {
          if (!orderedScores.find(s => s.id === score.id)) {
            orderedScores.push(score)
          }
        })

        // Calcola quanti spartiti sono stati trovati e aggiornati
        const foundCount = importData.scores.length - notFoundNames.length
        
        // Conferma importazione
        let message = `Importazione completata!\n\n`
        message += `Spartiti trovati e aggiornati: ${foundCount} su ${importData.scores.length}\n`
        
        if (notFoundNames.length > 0) {
          message += `\n⚠️ Spartiti non trovati (non saranno importati):\n${notFoundNames.slice(0, 5).join(', ')}`
          if (notFoundNames.length > 5) {
            message += ` ... e altri ${notFoundNames.length - 5}`
          }
          message += `\n\nAssicurati di aver caricato gli spartiti corrispondenti prima di importare.`
        }

        const confirmImport = window.confirm(message + '\n\nVuoi applicare le modifiche?')
        
        if (confirmImport) {
          setScores(orderedScores)
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      alert(`Errore durante l'importazione: ${error.message}`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (scores.length === 0) {
    return (
      <div className="score-list-empty">
        <p>Nessuno spartito caricato</p>
        <p className="hint">Seleziona una cartella per iniziare</p>
      </div>
    )
  }

  return (
    <div className="score-list-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <div className="score-list-header">
        <h2>Scaletta ({scores.length} spartiti)</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleImport}>
            📥 Importa JSON
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            📤 Esporta JSON
          </button>
          <button className="btn btn-primary" onClick={handlePlay}>
            ▶️ Play
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="scores">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="score-list"
            >
              {scores.map((score, index) => (
                <Draggable
                  key={score.id}
                  draggableId={score.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`score-item ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <div className="score-item-content">
                        <div
                          {...provided.dragHandleProps}
                          className="drag-handle"
                        >
                          ☰
                        </div>
                        <div className="score-info">
                          <div className="score-name">{score.name}</div>
                          <div className="score-order">#{index + 1}</div>
                        </div>
                        <div className="score-bpm">
                          {editingBPM === score.id ? (
                            <input
                              type="number"
                              min="30"
                              max="300"
                              defaultValue={score.bpm}
                              autoFocus
                              onBlur={(e) => handleBPMChange(score.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleBPMChange(score.id, e.target.value)
                                }
                                if (e.key === 'Escape') {
                                  setEditingBPM(null)
                                }
                              }}
                              className="bpm-input"
                            />
                          ) : (
                            <button
                              className="bpm-display"
                              onClick={() => setEditingBPM(score.id)}
                            >
                              {score.bpm} BPM
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
    </div>
  )
}

export default ScoreList

