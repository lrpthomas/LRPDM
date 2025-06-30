import { Router } from 'express';
import { upload, uploadCSV } from '../controllers/uploadController';

const router = Router();

router.post('/csv', upload.single('csvFile'), uploadCSV as any);

export default router;