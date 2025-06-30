import React, { useState, useCallback } from 'react';
import DrawingMapComponent, { Feature } from './DrawingMapComponent';

const DrawingMapExample: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [clickedCoordinates, setClickedCoordinates] = useState<{ lng: number; lat: number } | null>(null);

  const handleFeatureCreate = useCallback((feature: Feature) => {
    console.log('Feature created:', feature);
    setFeatures(prev => [...prev, feature]);
    
    // Example: Send to backend API
    // fetch('/api/spatial/features', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(feature)
    // });
  }, []);

  const handleFeatureUpdate = useCallback((feature: Feature) => {
    console.log('Feature updated:', feature);
    setFeatures(prev => 
      prev.map(f => f.id === feature.id ? feature : f)
    );
    
    // Example: Update backend
    // fetch(`/api/spatial/features/${feature.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(feature)
    // });
  }, []);

  const handleFeatureDelete = useCallback((featureId: string) => {
    console.log('Feature deleted:', featureId);
    setFeatures(prev => prev.filter(f => f.id !== featureId));
    
    // Example: Delete from backend
    // fetch(`/api/spatial/features/${featureId}`, {
    //   method: 'DELETE'
    // });
  }, []);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    console.log('Map clicked at:', lngLat);
    setClickedCoordinates(lngLat);

    // Example: Perform proximity search
    // const searchRadius = 1000; // 1km
    // fetch(`/api/spatial/proximity-search?lat=${lngLat.lat}&lng=${lngLat.lng}&radius=${searchRadius}`)
    //   .then(response => response.json())
    //   .then(data => {
    //     console.log('Nearby features:', data);
    //   });
  }, []);

  const exportFeatures = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: features
    };
    
    const dataStr = JSON.stringify(featureCollection, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawn-features.geojson';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importFeatures = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target?.result as string);
        if (geojson.type === 'FeatureCollection') {
          setFeatures(geojson.features);
        }
      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        alert('Invalid GeoJSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Interactive Drawing Map</h2>
      
      {/* Control Panel */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f5f5f5', 
        borderRadius: '5px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button 
          onClick={exportFeatures}
          disabled={features.length === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: features.length > 0 ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: features.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          Export GeoJSON ({features.length})
        </button>
        
        <label style={{ cursor: 'pointer' }}>
          <input
            type="file"
            accept=".geojson,.json"
            onChange={importFeatures}
            style={{ display: 'none' }}
          />
          <span style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Import GeoJSON
          </span>
        </label>

        <button
          onClick={() => setFeatures([])}
          disabled={features.length === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: features.length > 0 ? '#dc3545' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: features.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          Clear All
        </button>

        {clickedCoordinates && (
          <div style={{ 
            background: 'white', 
            padding: '5px 10px', 
            borderRadius: '3px',
            border: '1px solid #ddd'
          }}>
            Last click: {clickedCoordinates.lng.toFixed(4)}, {clickedCoordinates.lat.toFixed(4)}
          </div>
        )}
      </div>

      {/* Map Component */}
      <DrawingMapComponent
        initialCenter={[-74.006, 40.7128]} // NYC
        initialZoom={12}
        style={{ 
          width: '100%', 
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}
        onFeatureCreate={handleFeatureCreate}
        onFeatureUpdate={handleFeatureUpdate}
        onFeatureDelete={handleFeatureDelete}
        onMapClick={handleMapClick}
        enableDrawing={true}
        drawingModes={['point', 'line_string', 'polygon']}
        existingFeatures={features}
        showCoordinates={true}
        showMeasurements={true}
      />

      {/* Feature List */}
      {features.length > 0 && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <h3>Drawn Features ({features.length})</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {features.map((feature, index) => (
              <div 
                key={feature.id} 
                style={{
                  padding: '8px',
                  margin: '5px 0',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedFeature(feature)}
              >
                <strong>{feature.geometry.type}</strong> - ID: {feature.id}
                <br />
                <small style={{ color: '#666' }}>
                  Coordinates: {JSON.stringify(feature.geometry.coordinates).substring(0, 50)}...
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Details */}
      {selectedFeature && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#e9ecef',
          borderRadius: '5px'
        }}>
          <h3>Selected Feature Details</h3>
          <pre style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '3px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(selectedFeature, null, 2)}
          </pre>
          <button
            onClick={() => setSelectedFeature(null)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#d1ecf1',
        borderRadius: '5px',
        borderLeft: '4px solid #bee5eb'
      }}>
        <h4>Instructions:</h4>
        <ul>
          <li><strong>Point:</strong> Click the point tool, then click on the map</li>
          <li><strong>Line:</strong> Click the line tool, click to add points, double-click to finish</li>
          <li><strong>Polygon:</strong> Click the polygon tool, click to add points, click the first point to close</li>
          <li><strong>Edit:</strong> Click on any feature to select and edit it</li>
          <li><strong>Delete:</strong> Select a feature and click the trash tool</li>
          <li><strong>Measurements:</strong> Area and length are calculated automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default DrawingMapExample;