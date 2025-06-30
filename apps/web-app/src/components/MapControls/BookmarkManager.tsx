import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, FlatList, TextInput, Alert } from 'react-native';
import { Map } from 'maplibre-gl';

interface Bookmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  createdAt: Date;
  description?: string;
}

interface BookmarkManagerProps {
  map: Map | null;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onBookmarkSelect?: (bookmark: Bookmark) => void;
}

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  map,
  position = 'bottom-right',
  onBookmarkSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkDescription, setNewBookmarkDescription] = useState('');

  // Load bookmarks from storage
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('gis-bookmarks');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const bookmarksWithDates = parsed.map((b: any) => ({
            ...b,
            createdAt: new Date(b.createdAt)
          }));
          setBookmarks(bookmarksWithDates);
        }
      }
    } catch (error) {
      console.warn('Could not load bookmarks:', error);
    }
  };

  const saveBookmarks = async (updatedBookmarks: Bookmark[]) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('gis-bookmarks', JSON.stringify(updatedBookmarks));
      }
      setBookmarks(updatedBookmarks);
    } catch (error) {
      console.warn('Could not save bookmarks:', error);
    }
  };

  const addCurrentLocation = () => {
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    
    if (!newBookmarkName.trim()) {
      Alert.alert('Error', 'Please enter a name for the bookmark');
      return;
    }

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      name: newBookmarkName.trim(),
      lat: center.lat,
      lng: center.lng,
      zoom: zoom,
      createdAt: new Date(),
      description: newBookmarkDescription.trim() || undefined
    };

    const updatedBookmarks = [newBookmark, ...bookmarks];
    saveBookmarks(updatedBookmarks);

    // Reset form
    setNewBookmarkName('');
    setNewBookmarkDescription('');
    setShowAddForm(false);
  };

  const deleteBookmark = (bookmarkId: string) => {
    Alert.alert(
      'Delete Bookmark',
      'Are you sure you want to delete this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
            saveBookmarks(updatedBookmarks);
          }
        }
      ]
    );
  };

  const goToBookmark = (bookmark: Bookmark) => {
    if (!map) return;

    map.flyTo({
      center: [bookmark.lng, bookmark.lat],
      zoom: bookmark.zoom,
      duration: 1000
    });

    if (onBookmarkSelect) {
      onBookmarkSelect(bookmark);
    }

    setIsOpen(false);
  };

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    switch (position) {
      case 'top-right':
        return { ...base, top: 130, right: 10 }; // Below other controls
      case 'top-left':
        return { ...base, top: 130, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
      case 'bottom-left':
        return { ...base, bottom: 130, left: 10 }; // Above scale control
      default:
        return { ...base, bottom: 10, right: 10 };
    }
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <View style={styles.bookmarkItem}>
      <TouchableOpacity
        style={styles.bookmarkMain}
        onPress={() => goToBookmark(item)}
        accessibilityLabel={`Go to bookmark: ${item.name}`}
      >
        <View style={styles.bookmarkContent}>
          <Text style={styles.bookmarkName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.bookmarkDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <Text style={styles.bookmarkCoords}>
            {item.lat.toFixed(4)}, {item.lng.toFixed(4)} • Zoom {item.zoom.toFixed(1)}
          </Text>
          <Text style={styles.bookmarkDate}>
            {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteBookmark(item.id)}
        accessibilityLabel={`Delete bookmark: ${item.name}`}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Toggle Button */}
      <TouchableOpacity
        style={[styles.toggleButton, isOpen && styles.toggleButtonActive]}
        onPress={() => setIsOpen(!isOpen)}
        accessibilityLabel={`${isOpen ? 'Close' : 'Open'} bookmarks`}
      >
        <Text style={styles.toggleIcon}>📍</Text>
        <Text style={styles.toggleText}>
          {bookmarks.length > 0 && (
            <Text style={styles.bookmarkCount}>{bookmarks.length}</Text>
          )}
        </Text>
      </TouchableOpacity>

      {/* Bookmarks Panel */}
      {isOpen && (
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Bookmarks</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(!showAddForm)}
              accessibilityLabel="Add bookmark"
            >
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Add Form */}
          {showAddForm && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                value={newBookmarkName}
                onChangeText={setNewBookmarkName}
                placeholder="Bookmark name"
                placeholderTextColor="#666"
                maxLength={50}
              />
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={newBookmarkDescription}
                onChangeText={setNewBookmarkDescription}
                placeholder="Description (optional)"
                placeholderTextColor="#666"
                maxLength={100}
                multiline
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewBookmarkName('');
                    setNewBookmarkDescription('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton]}
                  onPress={addCurrentLocation}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bookmarks List */}
          {bookmarks.length > 0 ? (
            <FlatList
              data={bookmarks}
              renderItem={renderBookmark}
              keyExtractor={(item) => item.id}
              style={styles.bookmarksList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookmarks yet</Text>
              <Text style={styles.emptySubtext}>
                Navigate to a location and tap + to add a bookmark
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 50,
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
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleIcon: {
    fontSize: 16,
  },
  toggleText: {
    marginLeft: 4,
  },
  bookmarkCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007bff',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    marginTop: 8,
    width: 280,
    maxHeight: 400,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007bff',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addForm: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  descriptionInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bookmarksList: {
    maxHeight: 250,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookmarkMain: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  bookmarkDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bookmarkCoords: {
    fontSize: 11,
    color: '#999',
    fontFamily: Platform.select({
      web: 'monospace',
      default: 'System',
    }),
  },
  bookmarkDate: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default BookmarkManager;