#!/bin/bash

echo "🗄️  PostgreSQL + PostGIS Setup for GIS Platform"
echo "================================================"

# Check if running on WSL
if grep -q microsoft /proc/version; then
    echo "🐧 Detected WSL environment"
    echo ""
    echo "WSL PostgreSQL Setup Options:"
    echo "1. Install PostgreSQL in WSL (recommended)"
    echo "2. Use PostgreSQL from Windows host"
    echo ""
    read -p "Choose option (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        echo "📦 Installing PostgreSQL + PostGIS in WSL..."
        
        # Update package list
        sudo apt update
        
        # Install PostgreSQL and PostGIS
        sudo apt install -y postgresql postgresql-contrib postgis postgresql-14-postgis-3
        
        # Start PostgreSQL service
        sudo service postgresql start
        
        # Create database and user
        sudo -u postgres createdb gis_platform
        sudo -u postgres psql -c "CREATE USER gis_user WITH PASSWORD 'gis_password';"
        sudo -u postgres psql -c "ALTER USER gis_user CREATEDB;"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gis_platform TO gis_user;"
        
        # Enable PostGIS extension
        sudo -u postgres psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"
        sudo -u postgres psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
        
        echo "✅ PostgreSQL + PostGIS installed successfully!"
        echo ""
        echo "Database Details:"
        echo "Host: localhost"
        echo "Port: 5432"
        echo "Database: gis_platform"
        echo "Username: gis_user"
        echo "Password: gis_password"
        
    elif [ "$choice" = "2" ]; then
        echo "🔗 Using PostgreSQL from Windows host"
        echo ""
        echo "Make sure PostgreSQL is running on Windows with:"
        echo "- Host: localhost or Windows IP"
        echo "- Port: 5432"
        echo "- PostGIS extension enabled"
        echo ""
        echo "Update your .env file with the correct connection details."
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    echo ""
    echo "Installing PostgreSQL + PostGIS with Homebrew..."
    
    # Install PostgreSQL and PostGIS
    brew install postgresql@14 postgis
    
    # Start PostgreSQL service
    brew services start postgresql@14
    
    # Create database and user
    createdb gis_platform
    psql -d gis_platform -c "CREATE USER gis_user WITH PASSWORD 'gis_password';"
    psql -d gis_platform -c "ALTER USER gis_user CREATEDB;"
    psql -d gis_platform -c "GRANT ALL PRIVILEGES ON DATABASE gis_platform TO gis_user;"
    
    # Enable PostGIS extension
    psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"
    psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
    
    echo "✅ PostgreSQL + PostGIS installed successfully!"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    echo ""
    echo "Installing PostgreSQL + PostGIS..."
    
    # Update package list
    sudo apt update
    
    # Install PostgreSQL and PostGIS
    sudo apt install -y postgresql postgresql-contrib postgis postgresql-14-postgis-3
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres createdb gis_platform
    sudo -u postgres psql -c "CREATE USER gis_user WITH PASSWORD 'gis_password';"
    sudo -u postgres psql -c "ALTER USER gis_user CREATEDB;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gis_platform TO gis_user;"
    
    # Enable PostGIS extension
    sudo -u postgres psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"
    sudo -u postgres psql -d gis_platform -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
    
    echo "✅ PostgreSQL + PostGIS installed successfully!"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install PostgreSQL + PostGIS manually."
    exit 1
fi

echo ""
echo "🔧 Next steps:"
echo "1. Update your .env file with database connection details"
echo "2. Run database migrations: pnpm run db:migrate"
echo "3. Start the development servers"
echo ""
echo "📄 Connection string format:"
echo "DATABASE_URL=postgresql://gis_user:gis_password@localhost:5432/gis_platform"