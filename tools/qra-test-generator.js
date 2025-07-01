#!/usr/bin/env node
// qra-test-data-generator.js - Generate test data for QRA stress testing

const fs = require('fs');
const path = require('path');

class TestDataGenerator {
  constructor() {
    this.outputDir = './test-data/qra-stress-tests';
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Generate massive GeoJSON file for stress testing
  generateLargeGeoJSON(featureCount = 100000) {
    console.log(`Generating GeoJSON with ${featureCount} features...`);
    
    const features = [];
    for (let i = 0; i < featureCount; i++) {
      features.push({
        type: 'Feature',
        id: i,
        geometry: {
          type: 'Point',
          coordinates: [
            -180 + Math.random() * 360, // longitude
            -90 + Math.random() * 180   // latitude
          ]
        },
        properties: {
          id: i,
          name: `Feature ${i}`,
          category: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
          value: Math.random() * 1000,
          timestamp: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'.repeat(Math.floor(Math.random() * 10))
        }
      });
    }

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    const filename = path.join(this.outputDir, `stress-test-${featureCount}-features.geojson`);
    fs.writeFileSync(filename, JSON.stringify(geojson));
    console.log(`Created: ${filename} (${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB)`);
    return filename;
  }

  // Generate malformed data for error handling tests
  generateMalformedData() {
    console.log('Generating malformed test files...');
    
    const testCases = [
      {
        name: 'invalid-geometry.geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'InvalidType',
              coordinates: 'not-an-array'
            }
          }]
        }
      },
      {
        name: 'missing-coordinates.geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point'
              // missing coordinates
            }
          }]
        }
      },
      {
        name: 'out-of-bounds.geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [200, 100] // Invalid lon/lat
            }
          }]
        }
      },
      {
        name: 'huge-property.geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            },
            properties: {
              hugeString: 'A'.repeat(10000000) // 10MB string
            }
          }]
        }
      }
    ];

    testCases.forEach(test => {
      const filename = path.join(this.outputDir, test.name);
      fs.writeFileSync(filename, JSON.stringify(test.data));
      console.log(`Created: ${filename}`);
    });
  }

  // Generate CSV files with edge cases
  generateEdgeCaseCSV() {
    console.log('Generating edge case CSV files...');
    
    // CSV with special characters
    const specialCharsCSV = `id,name,description,latitude,longitude
1,"Normal Name","Normal Description",40.7128,-74.0060
2,"Name with, comma","Description with ""quotes""",51.5074,-0.1278
3,"Name with
newline","Description with   tabs",48.8566,2.3522
4,"名前","説明",35.6762,139.6503
5,"<script>alert('xss')</script>","'; DROP TABLE features; --",52.5200,13.4050`;

    fs.writeFileSync(path.join(this.outputDir, 'special-characters.csv'), specialCharsCSV);

    // CSV with missing data
    const missingDataCSV = `id,name,value,latitude,longitude
1,Complete,100,40.7128,-74.0060
2,,200,51.5074,-0.1278
3,Name Only,,,
4,,,48.8566,2.3522
,No ID,300,52.5200,13.4050`;

    fs.writeFileSync(path.join(this.outputDir, 'missing-data.csv'), missingDataCSV);

    // Massive CSV
    const rows = ['id,name,category,value,latitude,longitude'];
    for (let i = 0; i < 1000000; i++) {
      rows.push(`${i},Feature${i},Category${i % 10},${Math.random() * 1000},${-90 + Math.random() * 180},${-180 + Math.random() * 360}`);
    }
    
    fs.writeFileSync(path.join(this.outputDir, 'massive-data.csv'), rows.join('\n'));
    console.log('Created edge case CSV files');
  }

  // Generate binary files that might be uploaded by mistake
  generateBinaryFiles() {
    console.log('G