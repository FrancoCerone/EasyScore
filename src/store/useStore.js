import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      scores: [],
      selectedFolder: null,
      currentScoreIndex: 0,
      isPerformanceMode: false,

      setScores: (scores) => set({ scores }),
      
      addScore: (score) => set((state) => ({
        scores: [...state.scores, score]
      })),

      updateScore: (id, updates) => set((state) => ({
        scores: state.scores.map(score =>
          score.id === id ? { ...score, ...updates } : score
        )
      })),

      removeScore: (id) => set((state) => ({
        scores: state.scores.filter(score => score.id !== id)
      })),

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

      clearAll: () => set({
        scores: [],
        selectedFolder: null,
        currentScoreIndex: 0,
        isPerformanceMode: false
      })
    }),
    {
      name: 'easyscore-storage',
      partialize: (state) => ({
        scores: state.scores.map(score => ({
          ...score,
          // Salva solo base64, non url (che non persiste)
          url: undefined,
          file: undefined
        })),
        selectedFolder: state.selectedFolder,
        currentScoreIndex: state.currentScoreIndex
      }),
      onRehydrateStorage: () => (state) => {
        // Quando si ripristina, assicurati che le immagini usino base64
        if (state?.scores) {
          state.scores = state.scores.map(score => ({
            ...score,
            // Usa base64 come url se disponibile
            url: score.base64 || score.url,
            // Assicurati che zoom sia sempre definito
            zoom: score.zoom || 100
          }))
        }
      }
    }
  )
)

export default useStore

