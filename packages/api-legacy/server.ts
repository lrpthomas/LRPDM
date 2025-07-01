import app from './app';
import { testConnection, checkPostGIS, initializePostGIS } from './config/database';

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('⚠️  Database connection failed. Server will start but database features will be unavailable.');
    } else {
      // Check and initialize PostGIS
      const hasPostGIS = await checkPostGIS();
      if (!hasPostGIS) {
        console.log('📦 Installing PostGIS extensions...');
        await initializePostGIS();
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 GIS Platform API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
      console.log(`📋 Task management: http://localhost:${PORT}/api/tasks`);
      console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
      console.log(`📂 Data Import Preview: http://localhost:${PORT}/api/data-import/file`);
      console.log(`💾 Data Import to DB: http://localhost:${PORT}/api/data-import/import`);
      console.log(`🗺️ Spatial queries: http://localhost:${PORT}/api/spatial/*`);
      console.log(`🚀 Advanced GIS: http://localhost:${PORT}/api/spatial-advanced/*`);
      console.log(`📄 Legacy CSV: http://localhost:${PORT}/api/upload/csv`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();