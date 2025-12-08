import React, { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import Metronome from './Metronome'
import './PerformanceMode.css'

const PerformanceMode = () => {
  const {
    scores,
    currentScoreIndex,
    nextScore,
    previousScore,
    setIsPerformanceMode,
    updateScore
  } = useStore()

  const [isPlaying, setIsPlaying] = useState(true)
  const [isPortraitMode, setIsPortraitMode] = useState(false)
  const currentScore = scores[currentScoreIndex]
  const [currentBPM, setCurrentBPM] = useState(currentScore?.bpm || 120)
  const [currentZoom, setCurrentZoom] = useState(currentScore?.zoom || 100)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [touchStartDistance, setTouchStartDistance] = useState(null)
  const [touchStartZoom, setTouchStartZoom] = useState(null)
  const scoreViewerRef = React.useRef(null)

  useEffect(() => {
    if (currentScore) {
      setCurrentBPM(currentScore.bpm || 120)
      setCurrentZoom(currentScore.zoom || 100)
      setImagePosition({ x: 0, y: 0 }) // Reset posizione quando cambia spartito
    }
  }, [currentScore])

  // Gestione zoom con rotella del mouse
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -10 : 10
        handleZoomChange(currentZoom + delta)
      }
    }

    const viewer = scoreViewerRef.current
    if (viewer) {
      viewer.addEventListener('wheel', handleWheel, { passive: false })
      return () => viewer.removeEventListener('wheel', handleWheel)
    }
  }, [currentZoom, currentScore])

  // Calcola distanza tra due punti touch
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Gestione drag dell'immagine quando è zoomata (mouse)
  const handleMouseDown = (e) => {
    if (currentZoom > 100 && e.button === 0) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && currentZoom > 100) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Gestione touch per pan e pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1 && currentZoom > 100) {
      // Pan con un dito
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - imagePosition.x,
        y: e.touches[0].clientY - imagePosition.y
      })
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom con due dita
      e.preventDefault()
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      setTouchStartDistance(distance)
      setTouchStartZoom(currentZoom)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging && currentZoom > 100) {
      // Pan
      setImagePosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      })
    } else if (e.touches.length === 2 && touchStartDistance !== null) {
      // Pinch-to-zoom
      e.preventDefault()
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      const scale = distance / touchStartDistance
      const newZoom = touchStartZoom * scale
      handleZoomChange(newZoom)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setTouchStartDistance(null)
    setTouchStartZoom(null)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const handleBPMChange = (newBPM) => {
    if (currentScore) {
      setCurrentBPM(newBPM)
      updateScore(currentScore.id, { bpm: newBPM })
    }
  }

  const handleZoomChange = (newZoom) => {
    if (currentScore) {
      const clampedZoom = Math.max(25, Math.min(500, newZoom))
      setCurrentZoom(clampedZoom)
      updateScore(currentScore.id, { zoom: clampedZoom })
    }
  }

  const handleZoomIn = () => {
    handleZoomChange(currentZoom + 10)
  }

  const handleZoomOut = () => {
    handleZoomChange(currentZoom - 10)
  }

  const handleZoomReset = () => {
    handleZoomChange(100)
    setImagePosition({ x: 0, y: 0 }) // Reset posizione quando si resetta lo zoom
  }

  const handleZoomFit = () => {
    // Calcola lo zoom per fittare l'immagine
    if (currentScore) {
      const img = new Image()
      img.onload = () => {
        const viewer = scoreViewerRef.current
        if (viewer) {
          const viewerWidth = viewer.clientWidth
          const viewerHeight = viewer.clientHeight - 200 // Sottrai spazio per header e controlli
          const imgAspect = img.width / img.height
          const viewerAspect = viewerWidth / viewerHeight
          
          let fitZoom = 100
          if (imgAspect > viewerAspect) {
            // Immagine più larga
            fitZoom = (viewerWidth / img.width) * 100
          } else {
            // Immagine più alta
            fitZoom = (viewerHeight / img.height) * 100
          }
          
          handleZoomChange(Math.min(200, Math.max(50, fitZoom)))
          setImagePosition({ x: 0, y: 0 }) // Reset posizione quando si fa fit
        }
      }
      img.src = currentScore.base64 || currentScore.url
    }
  }

  const handlePrevious = () => {
    if (currentScoreIndex > 0) {
      previousScore()
    }
  }

  const handleNext = () => {
    if (currentScoreIndex < scores.length - 1) {
      nextScore()
    }
  }

  const handleExit = () => {
    setIsPerformanceMode(false)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const togglePortraitMode = () => {
    const newPortraitMode = !isPortraitMode
    setIsPortraitMode(newPortraitMode)
    
    // Aggiungi/rimuovi classe al body per prevenire scroll
    if (newPortraitMode) {
      document.body.classList.add('portrait-mode-active')
    } else {
      document.body.classList.remove('portrait-mode-active')
    }
  }

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      document.body.classList.remove('portrait-mode-active')
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        handleExit()
      } else if (e.key === ' ') {
        e.preventDefault()
        handlePlayPause()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentScoreIndex, isPlaying])

  if (!currentScore) {
    return (
      <div className="performance-mode-empty">
        <p>Nessuno spartito disponibile</p>
        <button className="btn btn-primary" onClick={handleExit}>
          Torna alla lista
        </button>
      </div>
    )
  }

  return (
    <div className={`performance-mode ${isPortraitMode ? 'portrait-mode' : ''}`}>
      <div className="performance-header">
        <div className="score-counter">
          {currentScoreIndex + 1} / {scores.length}
        </div>
        <div className="score-title">{currentScore.name}</div>
        <div className="header-actions">
          <button 
            className="portrait-button" 
            onClick={togglePortraitMode}
            title={isPortraitMode ? 'Modalità Landscape' : 'Modalità Portrait'}
          >
            {isPortraitMode ? '🔄' : '📱'}
          </button>
          <button className="exit-button" onClick={handleExit}>
            ✕
          </button>
        </div>
      </div>

      <div 
        className="score-viewer"
        ref={scoreViewerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: currentZoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={currentScore.base64 || currentScore.url}
          alt={currentScore.name}
          className="score-image"
          style={{
            transform: `scale(${currentZoom / 100}) translate(${imagePosition.x / (currentZoom / 100)}px, ${imagePosition.y / (currentZoom / 100)}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }}
          draggable={false}
        />
      </div>

      <div className="zoom-controls">
        <button
          className="zoom-button"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
        >
          ➖
        </button>
        <button
          className="zoom-button zoom-reset"
          onClick={handleZoomReset}
          title="Reset Zoom (100%)"
        >
          {Math.round(currentZoom)}%
        </button>
        <button
          className="zoom-button zoom-fit"
          onClick={handleZoomFit}
          title="Fit to Screen"
        >
          🔍
        </button>
        <button
          className="zoom-button"
          onClick={handleZoomIn}
          title="Zoom In (+)"
        >
          ➕
        </button>
      </div>

      <div className="navigation-controls">
        <button
          className="nav-button prev"
          onClick={handlePrevious}
          disabled={currentScoreIndex === 0}
        >
          ⬅️ Precedente
        </button>
        <button
          className="nav-button next"
          onClick={handleNext}
          disabled={currentScoreIndex === scores.length - 1}
        >
          Successivo ➡️
        </button>
      </div>

      <Metronome
        bpm={currentBPM}
        isPlaying={isPlaying}
        onBPMChange={handleBPMChange}
        onPlayPause={handlePlayPause}
      />
    </div>
  )
}

export default PerformanceMode

