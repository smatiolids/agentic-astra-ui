import React from 'react'
import ReactDOM from 'react-dom/client'
// Import events polyfill for browser support
import 'events'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

