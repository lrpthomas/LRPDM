import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

interface BasemapOption {
  id: string;
  name: string;
  style: any;
  icon: string;
  preview?: string;
}

interface BasemapControlProps {
  currentBasemap: string;
  onBasemapChange: (basemapId: string, style: any) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
}

// Basemap configurations
const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: 'osm',
    name: 'Streets',
    icon: '🗺️',
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }
      ]
    }
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: '🛰️',
    style: {
      version: 8,
      sources: {
        'satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite'
        }
      ]
    }
  },
  {
    id: 'terrain',
    name: 'Terrain',
    icon: '🏔️',
    style: {
      version: 8,
      sources: {
        'terrain': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        }
      },
      layers: [
        {
          id: 'terrain',
          type: 'raster',
          source: 'terrain'
        }
      ]
    }
  },
  {
    id: 'cartodb-light',
    name: 'Light',
    icon: '☀️',
    style: {
      version: 8,
      sources: {
        'cartodb': {
          type: 'raster',
          tiles: [
            'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© CartoDB, © OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'cartodb',
          type: 'raster',
          source: 'cartodb'
        }
      ]
    }
  },
  {
    id: 'cartodb-dark',
    name: 'Dark',
    icon: '🌙',
    style: {
      version: 8,
      sources: {
        'cartodb-dark': {
          type: 'raster',
          tiles: [
            'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© CartoDB, © OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'cartodb-dark',
          type: 'raster',
          source: 'cartodb-dark'
        }
      ]
    }
  }
];

export const BasemapControl: React.FC<BasemapControlProps> = ({
  currentBasemap,
  onBasemapChange,
  position = 'top-right',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBasemapSelect = (option: BasemapOption) => {
    onBasemapChange(option.id, option.style);
    setIsExpanded(false);
  };

  const currentOption = BASEMAP_OPTIONS.find(opt => opt.id === currentBasemap) || BASEMAP_OPTIONS[0];

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    switch (position) {
      case 'top-right':
        return { ...base, top: 10, right: 10 };
      case 'top-left':
        return { ...base, top: 10, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
      case 'bottom-left':
        return { ...base, bottom: 10, left: 10 };
      default:
        return { ...base, top: 10, right: 10 };
    }
  };

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Current basemap button */}
      <TouchableOpacity
        style={[styles.currentButton, isExpanded && styles.currentButtonExpanded]}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityLabel={`Current basemap: ${currentOption.name}. Tap to change`}
      >
        <Text style={styles.icon}>{currentOption.icon}</Text>
        {!compact && <Text style={styles.buttonText}>{currentOption.name}</Text>}
        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Basemap options */}
      {isExpanded && (
        <View style={styles.optionsContainer}>
          {BASEMAP_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                option.id === currentBasemap && styles.optionButtonActive
              ]}
              onPress={() => handleBasemapSelect(option)}
              accessibilityLabel={`Switch to ${option.name} basemap`}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[
                styles.optionText,
                option.id === currentBasemap && styles.optionTextActive
              ]}>
                {option.name}
              </Text>
              {option.id === currentBasemap && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 200,
  },
  currentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  currentButtonExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  optionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  optionIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  optionText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#007bff',
  },
  checkmark: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default BasemapControl;