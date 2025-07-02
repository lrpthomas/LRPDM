import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, FlatList } from 'react-native';
import { Map, LngLat } from 'maplibre-gl';

interface SearchResult {
  id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  boundingbox?: [string, string, string, string];
}

interface GeocodingSearchProps {
  map: Map | null;
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  position?: 'top-center' | 'top-left' | 'top-right';
  placeholder?: string;
  maxResults?: number;
  debounceMs?: number;
}

export const GeocodingSearch: React.FC<GeocodingSearchProps> = ({
  map,
  onLocationSelect,
  position = 'top-center',
  placeholder = 'Search places...',
  maxResults = 5,
  debounceMs = 300
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<TextInput>(null);

  // Load recent searches from storage
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        if (Platform.OS === 'web') {
          const stored = localStorage.getItem('gis-recent-searches');
          if (stored) {
            setRecentSearches(JSON.parse(stored).slice(0, 3));
          }
        }
      } catch (error) {
        console.warn('Could not load recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debounceMs]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Using Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `format=json&` +
        `limit=${maxResults}&` +
        `addressdetails=1&` +
        `extratags=1`
      );

      if (!response.ok) throw new Error('Search failed');

      const data: SearchResult[] = await response.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Geocoding search failed:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Fly to location on map
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000
      });
    }

    // Save to recent searches
    saveToRecentSearches(result);

    // Clear search
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.blur();

    // Callback
    if (onLocationSelect) {
      onLocationSelect({
        lat,
        lng,
        name: result.display_name
      });
    }
  };

  const saveToRecentSearches = (result: SearchResult) => {
    try {
      const updated = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 3);
      setRecentSearches(updated);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('gis-recent-searches', JSON.stringify(updated));
      }
    } catch (error) {
      console.warn('Could not save recent search:', error);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1001 };
    switch (position) {
      case 'top-center':
        return { ...base, top: 10, left: '50%', transform: 'translateX(-50%)' };
      case 'top-left':
        return { ...base, top: 10, left: 120 }; // Next to basemap control
      case 'top-right':
        return { ...base, top: 10, right: 120 };
      default:
        return { ...base, top: 10, left: '50%', transform: 'translateX(-50%)' };
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultSelect(item)}
      accessibilityLabel={`Search result: ${item.display_name}`}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.display_name.split(',')[0]}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.display_name}
        </Text>
      </View>
      <Text style={styles.resultType}>{item.type}</Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => handleResultSelect(item)}
      accessibilityLabel={`Recent search: ${item.display_name}`}
    >
      <Text style={styles.recentIcon}>🕒</Text>
      <Text style={styles.recentText} numberOfLines={1}>
        {item.display_name.split(',')[0]}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#666"
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Delay hiding results to allow selection
            setTimeout(() => setShowResults(false), 200);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {(query.length > 0 || isLoading) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearIcon}>
              {isLoading ? '⌛' : '✕'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Dropdown */}
      {showResults && (
        <View style={styles.resultsContainer}>
          {results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id || `${item.lat}-${item.lon}`}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : query.trim().length < 2 && recentSearches.length > 0 ? (
            <View>
              <Text style={styles.sectionHeader}>Recent Searches</Text>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={(item) => `recent-${item.id || item.lat}-${item.lon}`}
                style={styles.recentsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          ) : (
            <Text style={styles.noResults}>
              {isLoading ? 'Searching...' : 'No results found'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    maxWidth: '90%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    ...Platform.select({
      web: {
        outline: 'none',
      },
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  resultsList: {
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  resultType: {
    fontSize: 11,
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: 'capitalize',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  recentsList: {
    maxHeight: 120,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#666',
  },
  recentText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default GeocodingSearch;