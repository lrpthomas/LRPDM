# Database Setup Guide

## Prerequisites
1. PostgreSQL 12+ installed
2. PostGIS 3.0+ extension available

## Setup Steps

### 1. Create Database
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database
CREATE DATABASE gis_platform;

-- Create user (optional)
CREATE USER gis_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gis_platform TO gis_user;

-- Exit psql
\q
```

### 2. Install PostGIS Extension
```sql
-- Connect to your database
psql -d gis_platform -U postgres

-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify installation
SELECT PostGIS_Version();

-- Exit
\q
```

### 3. Configure Environment
Update `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gis_platform
DB_USER=postgres
DB_PASSWORD=your_password
```

### 4. Run Migrations
```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start the server
pnpm dev
```

## Docker Setup (Alternative)
```bash
# Run PostGIS with Docker
docker run --name gis-db \
  -e POSTGRES_DB=gis_platform \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgis/postgis:15-3.4

# Run migrations
pnpm db:migrate
```

## Verification
```bash
# Test database connection
curl http://localhost:3000/health

# Check supported file types
curl http://localhost:3000/api/data-import/supported-types
```