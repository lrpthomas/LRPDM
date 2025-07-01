import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

export type UnitSystem = 'metric' | 'imperial';

interface UnitToggleProps {
  currentUnit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
  showLabels?: boolean;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({
  currentUnit,
  onUnitChange,
  position = 'top-left',
  compact = false,
  showLabels = true
}) => {
  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    switch (position) {
      case 'top-right':
        return { ...base, top: 70, right: 10 }; // Below basemap control
      case 'top-left':
        return { ...base, top: 70, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
      case 'bottom-left':
        return { ...base, bottom: 70, left: 10 }; // Above scale control
      default:
        return { ...base, top: 70, left: 10 };
    }
  };

  const handleToggle = () => {
    const newUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    onUnitChange(newUnit);
  };

  const getDisplayText = (unit: UnitSystem) => {
    if (compact) {
      return unit === 'metric' ? 'M' : 'I';
    }
    return unit === 'metric' ? 'Metric' : 'Imperial';
  };

  const getUnitExamples = (unit: UnitSystem) => {
    return unit === 'metric' ? 'km/m' : 'mi/ft';
  };

  return (
    <View style={[styles.container, getPositionStyle()]}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={handleToggle}
        accessibilityLabel={`Current unit: ${currentUnit}. Tap to switch to ${currentUnit === 'metric' ? 'imperial' : 'metric'}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: currentUnit === 'metric' }}
      >
        {/* Metric Option */}
        <View style={[
          styles.option,
          currentUnit === 'metric' && styles.optionActive,
          styles.optionLeft
        ]}>
          <Text style={[
            styles.optionText,
            currentUnit === 'metric' && styles.optionTextActive
          ]}>
            {getDisplayText('metric')}
          </Text>
          {showLabels && !compact && (
            <Text style={[
              styles.optionSubtext,
              currentUnit === 'metric' && styles.optionSubtextActive
            ]}>
              {getUnitExamples('metric')}
            </Text>
          )}
        </View>

        {/* Imperial Option */}
        <View style={[
          styles.option,
          currentUnit === 'imperial' && styles.optionActive,
          styles.optionRight
        ]}>
          <Text style={[
            styles.optionText,
            currentUnit === 'imperial' && styles.optionTextActive
          ]}>
            {getDisplayText('imperial')}
          </Text>
          {showLabels && !compact && (
            <Text style={[
              styles.optionSubtext,
              currentUnit === 'imperial' && styles.optionSubtextActive
            ]}>
              {getUnitExamples('imperial')}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Current unit indicator */}
      {compact && (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {getUnitExamples(currentUnit)}
          </Text>
        </View>
      )}
    </View>
  );
};

// Utility functions for unit conversion
export const convertDistance = (distance: number, fromUnit: UnitSystem, toUnit: UnitSystem): number => {
  if (fromUnit === toUnit) return distance;
  
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    // Convert meters to feet
    return distance * 3.28084;
  } else {
    // Convert feet to meters
    return distance / 3.28084;
  }
};

export const convertArea = (area: number, fromUnit: UnitSystem, toUnit: UnitSystem): number => {
  if (fromUnit === toUnit) return area;
  
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    // Convert square meters to square feet
    return area * 10.7639;
  } else {
    // Convert square feet to square meters
    return area / 10.7639;
  }
};

export const formatDistance = (distance: number, unit: UnitSystem): string => {
  if (unit === 'metric') {
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    } else {
      return `${(distance / 1000).toFixed(2)} km`;
    }
  } else {
    if (distance < 5280) {
      return `${Math.round(distance)} ft`;
    } else {
      return `${(distance / 5280).toFixed(2)} mi`;
    }
  }
};

export const formatArea = (area: number, unit: UnitSystem): string => {
  if (unit === 'metric') {
    if (area < 10000) {
      return `${Math.round(area)} m²`;
    } else {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
  } else {
    if (area < 43560) {
      return `${Math.round(area)} ft²`;
    } else {
      return `${(area / 43560).toFixed(2)} acres`;
    }
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
    overflow: 'hidden',
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
  option: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  optionLeft: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  optionRight: {
    // No additional styles needed
  },
  optionActive: {
    backgroundColor: '#007bff',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  optionSubtext: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },
  optionSubtextActive: {
    color: '#ffffff',
    opacity: 0.9,
  },
  indicator: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  indicatorText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
});

export default UnitToggle;