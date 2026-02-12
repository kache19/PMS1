import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handlers to prevent app from crashing on unhandled errors
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default behavior which logs to console
});

window.addEventListener('error', (event) => {
  console.warn('Global error:', event.error);
  // Don't prevent default - let React handle it
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);