import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Set Axios Base URL for Netlify / Render deployment
if (import.meta.env.VITE_API_URL) {
  const cleanUrl = String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '');
  axios.defaults.baseURL = cleanUrl;
}

// Register Service Worker for PWA Offline & Installability
if ('serviceWorker' in navigator && !window.location.host.includes('localhost:5173_disable')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('✅ [PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ [PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

