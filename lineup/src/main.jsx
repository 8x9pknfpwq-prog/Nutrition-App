import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initAnalytics } from './lib/analytics.js';
// Spectral (serif) — used only as an accent on the Leaderboard's display text.
import '@fontsource/spectral/600.css';
import '@fontsource/spectral/700.css';
import './index.css';

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
