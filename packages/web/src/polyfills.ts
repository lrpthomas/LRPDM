/**
 * Polyfills for web browsers and React Native Web compatibility
 */

// Core-js polyfills for older browsers
import 'core-js/stable';

// React Native Web polyfills
import 'react-native-web/dist/modules/ReactNativeEventEmitter';

// Map-related polyfills
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Performance API polyfill for older browsers
if (!window.performance) {
  (window as any).performance = {
    now: () => Date.now()
  };
}

// ResizeObserver polyfill for older browsers
if (!window.ResizeObserver) {
  const script = document.createElement('script');
  script.src = 'https://polyfill.io/v3/polyfill.min.js?features=ResizeObserver';
  document.head.appendChild(script);
}

// IntersectionObserver polyfill for older browsers
if (!window.IntersectionObserver) {
  const script = document.createElement('script');
  script.src = 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver';
  document.head.appendChild(script);
}