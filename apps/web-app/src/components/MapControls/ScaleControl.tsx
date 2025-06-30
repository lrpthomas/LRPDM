import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Map } from 'maplibre-gl';

interface ScaleControlProps {
  map: Map | null;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  units?: 'metric' | 'imperial' | 'both';
  maxWidth?: number;
  showZoomLevel?: boolean;
}

export const ScaleControl: React.FC<ScaleControlProps> = ({
  map,
  position = 'bottom-left',
  units = 'metric',
  maxWidth = 100,
  showZoomLevel = true
}) => {
  const [scale, setScale] = useState<{
    distance: number;
    unit: string;
    width: number;
    zoom: number;
  }>({
    distance: 0,
    unit: 'km',
    width: 0,
    zoom: 0
  });

  useEffect(() => {
    if (!map) return;

    const updateScale = () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      
      // Calculate scale based on zoom level and latitude
      // At the equator, one degree of longitude is approximately 111.32 km
      const metersPerPixel = 156543.034 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
      
      // Calculate distance for maxWidth pixels
      const distanceMeters = metersPerPixel * maxWidth;
      
      let distance: number;
      let unit: string;
      let displayWidth: number;

      if (units === 'imperial') {
        // Convert to feet/miles
        const distanceFeet = distanceMeters * 3.28084;
        if (distanceFeet < 5280) {
          // Show in feet
          distance = Math.round(distanceFeet / 100) * 100;
          unit = 'ft';
          displayWidth = (distance / distanceFeet) * maxWidth;
        } else {
          // Show in miles
          const distanceMiles = distanceFeet / 5280;
          distance = Math.round(distanceMiles * 10) / 10;
          unit = 'mi';
          displayWidth = (distance * 5280 / distanceFeet) * maxWidth;
        }
      } else {
        // Metric units
        if (distanceMeters < 1000) {
          // Show in meters
          distance = Math.round(distanceMeters / 10) * 10;
          unit = 'm';
          displayWidth = (distance / distanceMeters) * maxWidth;
        } else {
          // Show in kilometers
          const distanceKm = distanceMeters / 1000;
          distance = Math.round(distanceKm * 10) / 10;
          unit = 'km';
          displayWidth = (distance * 1000 / distanceMeters) * maxWidth;
        }
      }

      setScale({
        distance,
        unit,
        width: Math.max(displayWidth, 20), // Minimum width of 20px
        zoom: Math.round(zoom * 10) / 10
      });
    };

    // Update scale on map move/zoom
    map.on('zoom', updateScale);
    map.on('move', updateScale);
    
    // Initial calculation
    updateScale();

    return () => {
      map.off('zoom', updateScale);
      map.off('move', updateScale);
    };
  }, [map, units, maxWidth]);

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
      case 'top-left':
        return { ...base, top: 10, left: 10 };
      case 'top-right':
        return { ...base, top: 10, right: 10 };
      default:
        return { ...base, bottom: 10, left: 10 };
    }
  };

  if (!map || scale.distance === 0) return null;

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Scale bar */}
      <View style={styles.scaleContainer}>
        <View style={[styles.scaleLine, { width: scale.width }]} />
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleText}>0</Text>
          <Text style={styles.scaleText}>
            {scale.distance} {scale.unit}
          </Text>
        </View>
      </View>
      
      {/* Zoom level */}
      {showZoomLevel && (
        <View style={styles.zoomContainer}>
          <Text style={styles.zoomText}>
            Zoom: {scale.zoom}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  scaleContainer: {
    marginBottom: 4,
  },
  scaleLine: {
    height: 3,
    backgroundColor: '#333',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#333',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  scaleText: {
    fontSize: 11,
    color: '#333',
    fontFamily: Platform.select({
      web: 'monospace',
      default: 'System',
    }),
  },
  zoomContainer: {
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  zoomText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.select({
      web: 'monospace',
      default: 'System',
    }),
  },
});

export default ScaleControl;