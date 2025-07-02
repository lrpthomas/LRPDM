import { Router } from 'express';
import multer from 'multer';
import { CSVUploadController } from '../controllers/csvUploadController';

const router: Router = Router();

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    // Accept CSV files only
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// CSV upload preview endpoint
router.post('/preview', upload.single('file'), async (req, res) => {
  await CSVUploadController.previewCSV(req as any, res);
});

// CSV upload and import endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  await CSVUploadController.uploadCSV(req as any, res);
});

export default router;