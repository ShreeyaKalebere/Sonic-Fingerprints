import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker for App Installation & Offline Shell
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] Service Worker registered with scope:', reg.scope);
    }).catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

