import React, { useState, useEffect, useRef } from 'react'
import MetronomeClass from '../utils/metronome'
import './Metronome.css'

const Metronome = ({ bpm, isPlaying, onBPMChange, onPlayPause }) => {
  const [currentBPM, setCurrentBPM] = useState(bpm)
  const [tick, setTick] = useState(0)
  const [soundType, setSoundType] = useState('classic')
  const metronomeRef = useRef(null)

  useEffect(() => {
    if (!metronomeRef.current) {
      metronomeRef.current = new MetronomeClass()
      metronomeRef.current.init()
    }

    return () => {
      if (metronomeRef.current) {
        metronomeRef.current.destroy()
        metronomeRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (metronomeRef.current) {
      if (isPlaying) {
        metronomeRef.current.start(currentBPM, () => {
          setTick(prev => prev + 1)
        })
      } else {
        metronomeRef.current.stop()
        setTick(0)
      }
    }
  }, [isPlaying, currentBPM])

  useEffect(() => {
    if (metronomeRef.current && bpm !== currentBPM) {
      setCurrentBPM(bpm)
      metronomeRef.current.setBPM(bpm)
    }
  }, [bpm])

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setSoundType(soundType)
    }
  }, [soundType])

  const handleBPMChange = (newBPM) => {
    const bpmValue = parseInt(newBPM) || 60
    const clampedBPM = Math.max(30, Math.min(300, bpmValue))
    setCurrentBPM(clampedBPM)
    if (onBPMChange) {
      onBPMChange(clampedBPM)
    }
  }

  const soundTypes = [
    { id: 'classic', name: 'Classico', icon: '🔊' },
    { id: 'wood', name: 'Legno', icon: '🪵' },
    { id: 'beep', name: 'Beep', icon: '📢' }
  ]

  return (
    <div className="metronome-container">
      <div className="metronome-display">
        <div className="metronome-label">Metronomo</div>
        
        <div className="metronome-controls-row">
          <button
            className="play-pause-button"
            onClick={() => onPlayPause && onPlayPause()}
            aria-label={isPlaying ? 'Pausa' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <div className="sound-selector">
            {soundTypes.map((sound) => (
              <button
                key={sound.id}
                className={`sound-button ${soundType === sound.id ? 'active' : ''}`}
                onClick={() => setSoundType(sound.id)}
                title={sound.name}
              >
                {sound.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="metronome-bpm">
          <button
            className="bpm-button minus"
            onClick={() => handleBPMChange(currentBPM - 1)}
          >
            −
          </button>
          <div className="bpm-value">
            <span className="bpm-number">{currentBPM}</span>
            <span className="bpm-unit">BPM</span>
          </div>
          <button
            className="bpm-button plus"
            onClick={() => handleBPMChange(currentBPM + 1)}
          >
            +
          </button>
        </div>
        <input
          type="range"
          min="30"
          max="300"
          value={currentBPM}
          onChange={(e) => handleBPMChange(e.target.value)}
          className="bpm-slider"
        />
        <div className="metronome-visualizer">
          <div
            className={`metronome-beat ${isPlaying && tick % 4 === 0 ? 'active' : ''}`}
          />
        </div>
      </div>
    </div>
  )
}

export default Metronome

