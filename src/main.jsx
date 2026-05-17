import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PixelIdleChar from '../dz/PixelIdleChar.jsx'

/** 像素预览：npm run dev:pixel，或访问 /preview/pixel-idle */
function isPixelIdlePreview() {
  if (import.meta.env.VITE_PIXEL_PREVIEW === 'true') return true
  return window.location.pathname.replace(/\/+$/, '') === '/preview/pixel-idle'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPixelIdlePreview() ? <PixelIdleChar /> : <App />}
  </StrictMode>,
)
