import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload';
import dataImportRoutes from './routes/dataImport';
import proximitySearchRoutes from './routes/proximity-search';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks-simple';
import notificationRoutes from './routes/notifications-simple';
import spatialAdvancedRoutes from './routes/spatial-advanced';

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication endpoints
app.use('/api/auth', authRoutes);

// Task management endpoints
app.use('/api/tasks', taskRoutes);

// Notification endpoints
app.use('/api/notifications', notificationRoutes);

// Legacy CSV upload endpoint
app.use('/api/upload', uploadRoutes);

// Enhanced data import endpoints
app.use('/api/data-import', dataImportRoutes);

// Spatial query endpoints
app.use('/api/spatial', proximitySearchRoutes);

// Advanced spatial processing endpoints
app.use('/api/spatial-advanced', spatialAdvancedRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;