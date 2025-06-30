#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🗺️  GIS Platform Map Integration Setup Verification\n');

// Check if critical files exist
const criticalFiles = [
  'apps/web-app/webpack.config.js',
  'apps/web-app/babel.config.js',
  'apps/web-app/src/index.tsx',
  'apps/web-app/src/App.tsx',
  'apps/web-app/src/components/MapView/MapView.tsx',
  'apps/web-app/src/components/LayerControl/LayerControl.tsx',
  'apps/web-app/src/components/SpatialTools/DrawingTools.tsx',
  'apps/web-app/src/components/SpatialTools/SpatialSearch.tsx',
  'apps/web-app/src/components/MapLayout/MapLayout.tsx',
  'apps/web-app/src/components/DataTable/DataTable.tsx'
];

let allFilesExist = true;

console.log('📁 Checking critical files...');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check node_modules for key dependencies
console.log('\n📦 Checking key dependencies...');
const keyDeps = [
  'maplibre-gl',
  '@mapbox/mapbox-gl-draw',
  'react',
  'react-native-web',
  'react-window',
  'webpack'
];

let allDepsInstalled = true;
keyDeps.forEach(dep => {
  const exists = fs.existsSync(`node_modules/${dep}`);
  console.log(`${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) allDepsInstalled = false;
});

// Check package.json scripts
console.log('\n📜 Available scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
Object.keys(packageJson.scripts).forEach(script => {
  console.log(`✅ pnpm run ${script}`);
});

// Summary
console.log('\n📊 Setup Summary:');
console.log(`${allFilesExist ? '✅' : '❌'} All critical files present`);
console.log(`${allDepsInstalled ? '✅' : '❌'} All key dependencies installed`);

if (allFilesExist && allDepsInstalled) {
  console.log('\n🎉 Setup complete! Ready to start development.');
  console.log('\nNext steps:');
  console.log('1. Start backend: pnpm run dev');
  console.log('2. Start frontend: pnpm run web:serve');
  console.log('3. Open http://localhost:3000');
} else {
  console.log('\n⚠️  Some issues detected. Please check the logs above.');
}

console.log('\n📖 For detailed instructions, see: setup-map-integration.md');