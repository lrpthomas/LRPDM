import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, Text, TouchableOpacity } from 'react-native';
import { MapLayoutExample } from './components/MapLayout/MapLayoutExample';
import { DrawingMapExample } from './components/DrawingMapComponent';
import GISWorkspace from './components/GISWorkspace/GISWorkspace';
import EnhancedGISWorkspace from './components/GISWorkspace/EnhancedGISWorkspace';
import AuthComponent from './components/Auth/AuthComponent';
import './styles/vgk-theme.css';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'workspace' | 'enhanced' | 'original' | 'drawing'>('enhanced');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const handleAuthChange = (authenticated: boolean, userData?: User) => {
    setIsAuthenticated(authenticated);
    setUser(userData || null);
  };

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authWrapper}>
          <AuthComponent onAuthChange={handleAuthChange} />
        </View>
      </SafeAreaView>
    );
  }

  // Show main app interface when authenticated
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <View style={styles.navLeft}>
          <TouchableOpacity 
            style={[styles.navButton, currentView === 'enhanced' && styles.activeButton]}
            onPress={() => setCurrentView('enhanced')}
          >
            <Text style={[styles.navText, currentView === 'enhanced' && styles.activeText]}>
              🏒 VGK Workspace
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, currentView === 'workspace' && styles.activeButton]}
            onPress={() => setCurrentView('workspace')}
          >
            <Text style={[styles.navText, currentView === 'workspace' && styles.activeText]}>
              Classic Workspace
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, currentView === 'original' && styles.activeButton]}
            onPress={() => setCurrentView('original')}
          >
            <Text style={[styles.navText, currentView === 'original' && styles.activeText]}>
              Basic Layout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, currentView === 'drawing' && styles.activeButton]}
            onPress={() => setCurrentView('drawing')}
          >
            <Text style={[styles.navText, currentView === 'drawing' && styles.activeText]}>
              Drawing Tools
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.navRight}>
          <AuthComponent onAuthChange={handleAuthChange} />
        </View>
      </View>
      <View style={styles.content}>
        {currentView === 'enhanced' ? <EnhancedGISWorkspace /> :
         currentView === 'workspace' ? <GISWorkspace /> : 
         currentView === 'original' ? <MapLayoutExample /> : 
         <DrawingMapExample />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7', // VGK surface-primary
  },
  authWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: '#333F42', // VGK steel-gray
    borderBottomWidth: 2,
    borderBottomColor: '#B4975A', // VGK gold
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(51, 63, 66, 0.15)',
      },
    }),
  },
  navLeft: {
    flexDirection: 'row',
  },
  navRight: {
    flexShrink: 0,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeButton: {
    backgroundColor: '#B4975A', // VGK gold
    borderColor: '#B4975A',
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text on dark nav
  },
  activeText: {
    color: '#000000', // Black text on gold background
  },
  content: {
    flex: 1,
    ...Platform.select({
      web: {
        width: '100vw',
        height: 'calc(100vh - 60px)',
      },
    }),
  },
});

export default App;