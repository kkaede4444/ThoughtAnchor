import React from 'react'
import './desktop'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/500.css'
import '@xyflow/react/dist/style.css'
import './style.css'
import { App } from './App'
import type { DesktopAPI } from '../../shared/model'
declare global {
  interface Window {
    desktop: DesktopAPI
  }
}
if (location.hash === '#capture') document.title = 'ThoughtAnchor · 留住闪念'
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
