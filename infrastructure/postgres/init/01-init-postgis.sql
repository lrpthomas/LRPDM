-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create schema for spatial data
CREATE SCHEMA IF NOT EXISTS spatial;

-- Set search path
SET search_path TO public, spatial;

-- Create a function to update modified timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create base tables with spatial support
CREATE TABLE IF NOT EXISTS spatial_ref_sys_custom (
    srid INTEGER PRIMARY KEY,
    auth_name VARCHAR(256),
    auth_srid INTEGER,
    srtext VARCHAR(2048),
    proj4text VARCHAR(2048),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common projections
INSERT INTO spatial_ref_sys_custom (srid, auth_name, auth_srid, srtext, proj4text) 
VALUES 
    (4326, 'EPSG', 4326, 'WGS 84', '+proj=longlat +datum=WGS84 +no_defs'),
    (3857, 'EPSG', 3857, 'WGS 84 / Pseudo-Mercator', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs')
ON CONFLICT (srid) DO NOTHING;

-- Grant permissions
GRANT ALL ON SCHEMA spatial TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA spatial TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA spatial TO postgres;

-- Verify PostGIS installation
DO $$
DECLARE
    postgis_version TEXT;
BEGIN
    SELECT PostGIS_Version() INTO postgis_version;
    RAISE NOTICE 'PostGIS Version: %', postgis_version;
END $$;