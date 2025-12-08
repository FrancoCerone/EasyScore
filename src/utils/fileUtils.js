const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const loadImagesFromFiles = async (files) => {
  const imageFiles = Array.from(files).filter(file => {
    const extension = file.name.toLowerCase().split('.').pop()
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
  })

  const scores = await Promise.all(
    imageFiles.map(async (file, index) => {
      const url = URL.createObjectURL(file)
      const base64 = await fileToBase64(file)
      return {
        id: `${Date.now()}-${index}`,
        name: file.name,
        url: url,
        base64: base64, // Salva anche in base64 per persistenza
        bpm: 120,
        zoom: 100, // Zoom iniziale al 100%
        order: index
      }
    })
  )

  return scores.sort((a, b) => a.name.localeCompare(b.name))
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

