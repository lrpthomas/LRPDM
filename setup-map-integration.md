# Map Integration Setup Guide

## 1. Install Dependencies

Run the following command to install all required dependencies:

```bash
pnpm install
```

This will install:
- **MapLibre GL JS** - Open-source map rendering engine
- **Mapbox GL Draw** - Drawing tools for spatial features
- **React Native Web** - Cross-platform React components
- **React Window** - Virtual scrolling for performance
- **Webpack & Babel** - Build tools for web compilation

## 2. Start Development Servers

### Backend API Server
```bash
pnpm run dev
```
This starts the Fastify server on `http://localhost:8000`

### Frontend Web App
```bash
pnpm run web:serve
```
This starts the React web app on `http://localhost:3000`

## 3. Database Setup

Make sure PostgreSQL with PostGIS is running, then:

```bash
pnpm run db:migrate
```

## 4. Test the Integration

1. Open `http://localhost:3000` in your browser
2. You should see the MapLayout with:
   - Interactive map with MapLibre GL JS
   - Layer control panel (top-right)
   - Drawing tools (top-left)
   - Spatial search (bottom-right)
   - Data table (bottom half in split view)

## 5. Component Usage

### Basic MapLayout
```typescript
import { MapLayout } from './components/MapLayout';

<MapLayout
  layers={layers}
  datasets={datasets}
  features={features}
  onLayerToggle={handleLayerToggle}
  onSpatialQuery={handleSpatialQuery}
  showDrawingTools={true}
  showSpatialSearch={true}
/>
```

### Individual Components
```typescript
// Map view only
import { MapView } from './components/MapView';

// Layer management
import { LayerControl } from './components/LayerControl';

// Drawing tools
import { DrawingTools } from './components/SpatialTools';

// Spatial search
import { SpatialSearch } from './components/SpatialTools';

// Data table
import { DataTable } from './components/DataTable';
```

## 6. Mobile Testing

The components are mobile-optimized:
- Open Chrome DevTools
- Toggle device simulation
- Test on different screen sizes
- Verify touch interactions work

## 7. Production Build

```bash
pnpm run web:build
```

This creates optimized bundles in `apps/web-app/dist/`

## 8. Key Files Created

### Configuration
- `apps/web-app/webpack.config.js` - Webpack build configuration
- `apps/web-app/babel.config.js` - Babel transpilation setup
- `apps/web-app/tsconfig.json` - TypeScript configuration
- `apps/web-app/project.json` - Nx project configuration

### Application
- `apps/web-app/src/index.tsx` - App entry point
- `apps/web-app/src/App.tsx` - Main app component
- `apps/web-app/public/index.html` - HTML template

### Components
- `apps/web-app/src/components/MapView/` - Core map rendering
- `apps/web-app/src/components/LayerControl/` - Layer management
- `apps/web-app/src/components/SpatialTools/` - Drawing & search tools
- `apps/web-app/src/components/MapLayout/` - Integrated layout
- `apps/web-app/src/components/DataTable/` - Feature data table

## 9. Environment Variables

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/gis_platform

# Map Configuration
MAPLIBRE_STYLE_URL=https://demotiles.maplibre.org/style.json

# API Configuration
API_BASE_URL=http://localhost:8000
WEB_APP_PORT=3000
```

## 10. Performance Optimization

The setup includes:
- ✅ Virtual scrolling for large datasets
- ✅ Map layer optimization
- ✅ Code splitting for bundle optimization
- ✅ Mobile-first responsive design
- ✅ Memory-efficient rendering

## 11. Troubleshooting

### Common Issues

**Map not loading:**
- Check console for MapLibre GL JS errors
- Verify internet connection for map tiles
- Check CSP headers if running on HTTPS

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `npx tsc --noEmit`

**Performance issues:**
- Enable React DevTools Profiler
- Check virtual scrolling is working
- Monitor memory usage in browser DevTools

**Mobile issues:**
- Test in actual mobile browsers, not just DevTools
- Check touch event handling
- Verify viewport meta tag is set correctly

## 12. Next Steps

1. **API Integration**: Connect to your PostGIS endpoints
2. **Custom Styling**: Adjust colors/theme to match your design
3. **Authentication**: Add user authentication
4. **Real-time Updates**: Implement WebSocket for live data
5. **Offline Support**: Add service worker for offline functionality

## 13. Dependencies Installed

```json
{
  "dependencies": {
    "maplibre-gl": "^4.7.1",
    "@mapbox/mapbox-gl-draw": "^1.4.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-native": "^0.76.4",
    "react-native-web": "^0.19.12",
    "react-window": "^1.8.10",
    "csv-parse": "^5.5.6"
  },
  "devDependencies": {
    "@babel/core": "^7.25.9",
    "@babel/preset-env": "^7.25.9",
    "@babel/preset-react": "^7.25.7",
    "@babel/preset-typescript": "^7.25.9",
    "webpack": "^5.96.1",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.1.0"
  }
}
```

The map integration is now ready for development! 🗺️