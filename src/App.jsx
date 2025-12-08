import React from 'react'
import useStore from './store/useStore'
import FolderSelector from './components/FolderSelector'
import ScoreList from './components/ScoreList'
import PerformanceMode from './components/PerformanceMode'
import './App.css'

function App() {
  const { isPerformanceMode } = useStore()

  if (isPerformanceMode) {
    return <PerformanceMode />
  }

  return (
    <div className="app">
      <FolderSelector />
      <ScoreList />
    </div>
  )
}

export default App

