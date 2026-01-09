// Utility per gestire IndexedDB per le immagini degli spartiti

const DB_NAME = 'easyscore-images'
const DB_VERSION = 1
const STORE_NAME = 'scores'

let dbInstance = null

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export const saveScoreImage = async (scoreId, base64) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.put({ id: scoreId, base64 })
  } catch (error) {
    console.error('Error saving image to IndexedDB:', error)
    throw error
  }
}

export const getScoreImage = async (scoreId) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(scoreId)
      request.onsuccess = () => resolve(request.result?.base64 || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting image from IndexedDB:', error)
    return null
  }
}

export const deleteScoreImage = async (scoreId) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.delete(scoreId)
  } catch (error) {
    console.error('Error deleting image from IndexedDB:', error)
  }
}

export const saveAllScoreImages = async (scores) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const promises = scores
      .filter(score => score.base64)
      .map(score => store.put({ id: score.id, base64: score.base64 }))
    
    await Promise.all(promises)
  } catch (error) {
    console.error('Error saving all images to IndexedDB:', error)
    throw error
  }
}

export const loadAllScoreImages = async (scores) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const promises = scores.map(score => {
      return new Promise((resolve) => {
        const request = store.get(score.id)
        request.onsuccess = () => {
          const result = request.result
          if (result && result.base64) {
            resolve({ ...score, base64: result.base64, url: result.base64 })
          } else {
            resolve(score)
          }
        }
        request.onerror = () => resolve(score)
      })
    })
    
    return Promise.all(promises)
  } catch (error) {
    console.error('Error loading images from IndexedDB:', error)
    return scores
  }
}

export const clearAllImages = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.clear()
  } catch (error) {
    console.error('Error clearing IndexedDB:', error)
  }
}






