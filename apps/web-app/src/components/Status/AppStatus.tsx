import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const AppStatus: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ GIS Platform Status</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Components Loaded:</Text>
        <Text style={styles.item}>• Data Table (Virtual Scrolling)</Text>
        <Text style={styles.item}>• Layer Control Panel</Text>
        <Text style={styles.item}>• Drawing Tools</Text>
        <Text style={styles.item}>• Spatial Search</Text>
        <Text style={styles.item}>• Responsive Layout</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ System Info:</Text>
        <Text style={styles.item}>• React Native Web: v0.19.13</Text>
        <Text style={styles.item}>• MapLibre GL JS: v4.7.1</Text>
        <Text style={styles.item}>• Platform: {Platform.OS}</Text>
        <Text style={styles.item}>• API Endpoint: http://localhost:8000</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Mock Data:</Text>
        <Text style={styles.item}>• 100 Restaurant Points</Text>
        <Text style={styles.item}>• 10 Trail Lines</Text>
        <Text style={styles.item}>• 5 Neighborhood Polygons</Text>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          ⚠️ Map initialization pending - checking container reference
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      }
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#007AFF',
  },
  item: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 5,
    color: '#555',
  },
  warning: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
});

export default AppStatus;