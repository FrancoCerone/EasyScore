import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveAllScoreImages, loadAllScoreImages, deleteScoreImage } from '../utils/indexedDB'

const useStore = create(
  persist(
    (set, get) => ({
      scores: [],
      selectedFolder: null,
      currentScoreIndex: 0,
      isPerformanceMode: false,

      setScores: async (scores) => {
        // Salva le immagini in IndexedDB prima di aggiornare lo stato
        try {
          await saveAllScoreImages(scores)
        } catch (error) {
          console.error('Error saving images to IndexedDB:', error)
          // Continua comunque anche se IndexedDB fallisce
        }
        // Salva solo metadati nello stato (le immagini sono in IndexedDB)
        set({ scores: scores.map(score => ({
          ...score,
          // Mantieni base64 nello stato per uso immediato, ma non viene salvato in LocalStorage
          base64: score.base64,
          url: score.base64 || score.url
        })) })
      },
      
      addScore: async (score) => {
        // Salva l'immagine in IndexedDB se presente
        if (score.base64) {
          try {
            await saveAllScoreImages([score])
          } catch (error) {
            console.error('Error saving image to IndexedDB:', error)
          }
        }
        set((state) => ({
          scores: [...state.scores, score]
        }))
      },

      updateScore: async (id, updates) => {
        // Se viene aggiornata l'immagine, salvala in IndexedDB
        if (updates.base64) {
          try {
            await saveAllScoreImages([{ id, base64: updates.base64 }])
          } catch (error) {
            console.error('Error saving image to IndexedDB:', error)
          }
        }
        set((state) => ({
          scores: state.scores.map(score =>
            score.id === id ? { ...score, ...updates } : score
          )
        }))
      },

      removeScore: async (id) => {
        // Rimuovi l'immagine da IndexedDB
        try {
          await deleteScoreImage(id)
        } catch (error) {
          console.error('Error deleting image from IndexedDB:', error)
        }
        set((state) => ({
          scores: state.scores.filter(score => score.id !== id)
        }))
      },

      reorderScores: (newOrder) => set({ scores: newOrder }),

      setSelectedFolder: (folder) => set({ selectedFolder: folder }),

      setCurrentScoreIndex: (index) => set({ currentScoreIndex: index }),

      nextScore: () => set((state) => ({
        currentScoreIndex: state.currentScoreIndex < state.scores.length - 1
          ? state.currentScoreIndex + 1
          : state.currentScoreIndex
      })),

      previousScore: () => set((state) => ({
        currentScoreIndex: state.currentScoreIndex > 0
          ? state.currentScoreIndex - 1
          : state.currentScoreIndex
      })),

      setIsPerformanceMode: (isPerformanceMode) => set({ isPerformanceMode }),

      clearAll: async () => {
        // Pulisci IndexedDB
        try {
          await import('../utils/indexedDB').then(({ clearAllImages }) => clearAllImages())
        } catch (error) {
          console.error('Error clearing IndexedDB:', error)
        }
        set({
          scores: [],
          selectedFolder: null,
          currentScoreIndex: 0,
          isPerformanceMode: false
        })
      }
    }),
    {
      name: 'easyscore-storage',
      partialize: (state) => ({
        // Salva SOLO metadati, NON le immagini base64
        scores: state.scores.map(score => ({
          id: score.id,
          name: score.name,
          bpm: score.bpm,
          zoom: score.zoom || 100,
          // NON salvare base64, url, file nel LocalStorage
        })),
        selectedFolder: state.selectedFolder,
        currentScoreIndex: state.currentScoreIndex
      }),
      onRehydrateStorage: () => async (state) => {
        // Quando si ripristina, carica le immagini da IndexedDB
        if (state?.scores && state.scores.length > 0) {
          try {
            const scoresWithImages = await loadAllScoreImages(state.scores)
            state.scores = scoresWithImages.map(score => ({
              ...score,
              // Assicurati che zoom sia sempre definito
              zoom: score.zoom || 100
            }))
          } catch (error) {
            console.error('Error loading images from IndexedDB:', error)
            // Se IndexedDB fallisce, almeno mantieni i metadati
            state.scores = state.scores.map(score => ({
              ...score,
              zoom: score.zoom || 100
            }))
          }
        }
      }
    }
  )
)

export default useStore

