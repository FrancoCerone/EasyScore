class Metronome {
  constructor() {
    this.audioContext = null
    this.intervalId = null
    this.bpm = 120
    this.isPlaying = false
    this.onTick = null
    this.audioBuffers = {}
    this.soundType = 'classic' // 'classic', 'wood', 'beep'
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      await this.createAllSounds()
    } catch (error) {
      console.error('Error initializing metronome:', error)
    }
  }

  async createAllSounds() {
    // Suono classico (click tradizionale)
    this.audioBuffers.classic = this.createClickSound(800, 0.01, 50)
    
    // Suono wood block (legno)
    this.audioBuffers.wood = this.createClickSound(600, 0.015, 30)
    
    // Suono beep elettronico
    this.audioBuffers.beep = this.createClickSound(1000, 0.008, 60)
  }

  createClickSound(frequency, duration, decayRate) {
    const sampleRate = this.audioContext.sampleRate
    const frames = Math.floor(sampleRate * duration)
    
    const buffer = this.audioContext.createBuffer(1, frames, sampleRate)
    const channelData = buffer.getChannelData(0)
    
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * decayRate)
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
    }
    
    return buffer
  }

  setSoundType(type) {
    if (['classic', 'wood', 'beep'].includes(type)) {
      this.soundType = type
    }
  }

  playClick() {
    if (!this.audioContext || !this.audioBuffers[this.soundType]) return

    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    
    source.buffer = this.audioBuffers[this.soundType]
    gainNode.gain.value = 0.5
    
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    source.start(0)
  }

  start(bpm, onTick) {
    if (this.isPlaying) {
      this.stop()
    }

    this.bpm = bpm
    this.onTick = onTick
    this.isPlaying = true

    const interval = (60 / bpm) * 1000 // ms tra i click

    this.intervalId = setInterval(() => {
      this.playClick()
      if (this.onTick) {
        this.onTick()
      }
    }, interval)

    // Primo click immediato
    this.playClick()
    if (this.onTick) {
      this.onTick()
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isPlaying = false
  }

  setBPM(bpm) {
    const wasPlaying = this.isPlaying
    if (wasPlaying) {
      this.stop()
      this.start(bpm, this.onTick)
    } else {
      this.bpm = bpm
    }
  }

  destroy() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

export default Metronome

