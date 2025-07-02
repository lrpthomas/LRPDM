#!/bin/bash

# Database setup script for LRPDM GIS Platform

set -e

echo "🚀 Setting up PostgreSQL with PostGIS for LRPDM..."

# Check if running in Docker or local
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "Docker is available. Using Docker Compose..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Start PostgreSQL with PostGIS
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U postgres &>/dev/null; then
            echo "PostgreSQL is ready!"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Run initialization if needed
    docker-compose exec -T postgres psql -U postgres -c "SELECT PostGIS_Version();" 2>/dev/null || {
        echo "Installing PostGIS extensions..."
        docker-compose exec -T postgres psql -U postgres < infrastructure/postgres/init/01-init-postgis.sql
    }
    
else
    echo "Docker not available. Please ensure PostgreSQL 16 with PostGIS 3.4 is installed locally."
    echo ""
    echo "For Ubuntu/Debian:"
    echo "  sudo apt-get install postgresql-16 postgresql-16-postgis-3"
    echo ""
    echo "For macOS with Homebrew:"
    echo "  brew install postgresql@16 postgis"
    echo ""
    echo "Then create the database manually:"
    echo "  createdb lrpdm_gis"
    echo "  psql -d lrpdm_gis -c 'CREATE EXTENSION postgis;'"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: lrpdm_gis"
echo "  User: postgres"
echo "  Password: postgres (for Docker) or your local password"