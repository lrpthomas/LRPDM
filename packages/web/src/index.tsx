import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import App from './App';

// Register the app for React Native Web
AppRegistry.registerComponent('GISPlatform', () => App);

// Web-specific rendering
if (typeof document !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
    
    // Hide loading indicator
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }
}

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept();
}