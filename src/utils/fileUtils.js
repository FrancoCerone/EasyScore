import { createTabSalaScore, isEasyScoreFileName, isTabSalaDocument } from './easyscoreFormat'

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

const getExtension = (name) => name.toLowerCase().split('.').pop()

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

const createImageScore = async (file, id) => ({
  id,
  name: file.name,
  url: URL.createObjectURL(file),
  base64: await fileToBase64(file), // Salva anche in base64 per persistenza
  bpm: 120,
  zoom: 100 // Zoom iniziale al 100%
})

/**
 * Carica immagini e file EasyScore (.easyscore.json, kind "tab-sala").
 * Ogni file diventa uno spartito della scaletta.
 * Restituisce gli spartiti validi e l'elenco dei file scartati con il motivo.
 */
export const loadScoresFromFiles = async (files) => {
  const stamp = Date.now()
  const rejected = []

  const results = await Promise.all(
    Array.from(files).map(async (file, index) => {
      const id = `${stamp}-${index}`
      const extension = getExtension(file.name)

      if (IMAGE_EXTENSIONS.includes(extension)) {
        return createImageScore(file, id)
      }

      if (isEasyScoreFileName(file.name)) {
        try {
          const data = JSON.parse(await readFileAsText(file))
          // Le configurazioni esportate da questa app non sono spartiti: le ignoriamo
          if (!isTabSalaDocument(data)) return null
          return createTabSalaScore(data, file.name, id)
        } catch (error) {
          const reason = error instanceof SyntaxError ? 'JSON non valido' : error.message
          rejected.push(`${file.name}: ${reason}`)
        }
      }
      return null
    })
  )

  const scores = results
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((score, order) => ({ ...score, order }))

  return { scores, rejected }
}

export const exportToJSON = (scores) => {
  // Verifica che tutti gli spartiti abbiano le immagini
  const scoresWithoutImages = scores.filter(score => !score.base64)
  if (scoresWithoutImages.length > 0) {
    alert(
      `Attenzione: ${scoresWithoutImages.length} spartito/i non hanno immagini salvate.\n\n` +
      `Gli spartiti senza immagini non verranno esportati completamente.\n\n` +
      `Spartiti interessati:\n${scoresWithoutImages.map(s => s.name).join(', ')}`
    )
  }

  const exportData = {
    version: '2.0.0', // Versione 2.0 include le immagini
    exportDate: new Date().toISOString(),
    scores: scores
      .filter(score => score.base64) // Esporta solo spartiti con immagini
      .map((score, index) => ({
        id: score.id,
        name: score.name,
        bpm: score.bpm,
        zoom: score.zoom || 100,
        base64: score.base64, // Include l'immagine in base64
        ...(score.pages ? { kind: score.kind, pages: score.pages, precount: score.precount || 0 } : {}),
        order: index
      }))
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `easyscore-config-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const importFromJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.readAsText(file)
  })
}

