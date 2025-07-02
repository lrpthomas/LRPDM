import { Router } from 'express';
import { upload, uploadFile } from '../controllers/enhancedUploadController';
import { importFile } from '../controllers/importController';
import { getAllSupportedTypes } from '../utils/fileValidation';

const router: Router = Router();

// Enhanced upload endpoint that supports multiple file formats (preview only)
router.post('/file', upload.single('file'), uploadFile as any);

// Import endpoint that saves data to PostGIS database
router.post('/import', upload.single('file'), importFile as any);

// Get supported file types
router.get('/supported-types', (_req, res) => {
  const supportedTypes = getAllSupportedTypes();
  res.json({
    success: true,
    supportedTypes,
    maxFileSize: '100MB',
    description: 'Upload CSV, Excel (.xlsx), Shapefile (.zip), or GeoJSON files'
  });
});

// Health check for data import service
router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'Data Import Service',
    timestamp: new Date().toISOString()
  });
});

export default router;