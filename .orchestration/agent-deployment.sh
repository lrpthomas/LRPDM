#!/bin/bash
# Enterprise Multi-Agent Orchestration Framework Deployment Script
# GIS Platform Implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/crta/projects/gis-platform"
AGENTS_DIR="$PROJECT_ROOT/.agents"
ORCHESTRATION_DIR="$PROJECT_ROOT/.orchestration"
LOGS_DIR="$PROJECT_ROOT/logs/agents"

# Default values
TEAM_SIZE=${TEAM_SIZE:-5}
LANGUAGE=${LANGUAGE:-"typescript"}
VCS_TYPE=${VCS_TYPE:-"git"}
ORCHESTRATION_PLATFORM=${ORCHESTRATION_PLATFORM:-"docker"}
NOTIFICATION_CHANNEL=${NOTIFICATION_CHANNEL:-"slack"}

print_header() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "  Enterprise Multi-Agent Orchestration Framework"
    echo "  GIS Platform Implementation"
    echo "======================================================"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check for required tools
    local required_tools=("node" "npm" "docker" "git")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            print_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

setup_directory_structure() {
    print_status "Setting up directory structure..."
    
    # Create necessary directories
    mkdir -p "$LOGS_DIR"
    mkdir -p "$PROJECT_ROOT/data/agent-models"
    mkdir -p "$PROJECT_ROOT/config/agents"
    mkdir -p "$PROJECT_ROOT/scripts/agents"
    
    # Set permissions
    chmod 755 "$AGENTS_DIR"
    chmod 755 "$ORCHESTRATION_DIR"
    chmod 755 "$LOGS_DIR"
    
    print_status "Directory structure created"
}

install_dependencies() {
    print_status "Installing agent framework dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install additional packages for agent framework
    npm install --save yaml ws bcrypt jsonwebtoken
    npm install --save-dev @types/ws @types/bcrypt @types/jsonwebtoken
    
    print_status "Dependencies installed"
}

configure_environment() {
    print_status "Configuring environment..."
    
    # Create agent-specific environment file
    cat > "$PROJECT_ROOT/.env.agents" << EOF
# Agent Framework Configuration
AGENT_FRAMEWORK_ENABLED=true
AGENT_LOG_LEVEL=info
AGENT_METRICS_ENABLED=true

# Communication Configuration
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
EMAIL_SMTP_HOST=${EMAIL_SMTP_HOST:-""}
EMAIL_SMTP_PORT=${EMAIL_SMTP_PORT:-587}
EMAIL_USERNAME=${EMAIL_USERNAME:-""}
EMAIL_PASSWORD=${EMAIL_PASSWORD:-""}

# Performance Monitoring
METRICS_COLLECTION_INTERVAL=300000
PERFORMANCE_ANALYSIS_INTERVAL=3600000
OPTIMIZATION_AUTO_EXECUTE=true

# Security
AGENT_JWT_SECRET=${AGENT_JWT_SECRET:-$(openssl rand -hex 32)}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -hex 16)}

# Database for agent data
AGENT_DB_HOST=${DB_HOST:-localhost}
AGENT_DB_PORT=${DB_PORT:-5432}
AGENT_DB_NAME=${DB_NAME:-gis_platform}
AGENT_DB_USER=${DB_USER:-gis_user}
AGENT_DB_PASSWORD=${DB_PASSWORD:-gis_password}
EOF

    print_status "Environment configured"
}

compile_typescript() {
    print_status "Compiling TypeScript agent framework..."
    
    cd "$PROJECT_ROOT"
    
    # Compile orchestration engine
    npx tsc "$ORCHESTRATION_DIR"/*.ts --outDir "$PROJECT_ROOT/dist/orchestration" --target es2020 --module commonjs --esModuleInterop --resolveJsonModule
    
    if [ $? -ne 0 ]; then
        print_warning "TypeScript compilation had warnings, proceeding..."
    fi
    
    print_status "TypeScript compilation completed"
}

setup_database_schema() {
    print_status "Setting up agent framework database schema..."
    
    # Create agent-specific tables
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} << EOF
-- Agent Framework Tables

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(100) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    context JSONB,
    estimated_duration INTEGER,
    dependencies TEXT[],
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(100) NOT NULL,
    decision_context JSONB,
    confidence DECIMAL(3,2),
    risk_level DECIMAL(3,2),
    action_taken VARCHAR(200),
    reasoning TEXT,
    escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type VARCHAR(100) NOT NULL,
    metrics JSONB,
    performance_score DECIMAL(3,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS optimization_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    impact_estimate JSONB,
    implementation_details JSONB,
    executed BOOLEAN DEFAULT false,
    success BOOLEAN,
    actual_impact JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_type ON agent_tasks(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_type ON agent_decisions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_type ON agent_performance(agent_type);
CREATE INDEX IF NOT EXISTS idx_optimization_history_category ON optimization_history(category);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE agent_tasks TO ${DB_USER};
GRANT ALL PRIVILEGES ON TABLE agent_decisions TO ${DB_USER};
GRANT ALL PRIVILEGES ON TABLE agent_performance TO ${DB_USER};
GRANT ALL PRIVILEGES ON TABLE optimization_history TO ${DB_USER};

EOF

    if [ $? -eq 0 ]; then
        print_status "Database schema setup completed"
    else
        print_error "Failed to setup database schema"
        exit 1
    fi
}

create_docker_services() {
    print_status "Creating Docker services for agent framework..."
    
    # Create Docker Compose override for agents
    cat > "$PROJECT_ROOT/docker-compose.agents.yml" << EOF
version: '3.8'

services:
  orchestration-engine:
    build:
      context: .
      dockerfile: Dockerfile.orchestration
    environment:
      - NODE_ENV=production
      - AGENT_FRAMEWORK_ENABLED=true
    env_file:
      - .env
      - .env.agents
    volumes:
      - ./logs/agents:/app/logs
      - ./.agents:/app/.agents:ro
    depends_on:
      - postgres
      - redis
    networks:
      - gis-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  agent-dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
    ports:
      - "3002:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_WS_URL=ws://localhost:8001
    depends_on:
      - orchestration-engine
    networks:
      - gis-network
    restart: unless-stopped

networks:
  gis-network:
    external: true
EOF

    # Create Dockerfile for orchestration engine
    cat > "$PROJECT_ROOT/Dockerfile.orchestration" << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy agent framework files
COPY .orchestration ./orchestration
COPY .agents ./agents
COPY dist/orchestration ./dist/orchestration

# Create logs directory
RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "dist/orchestration/orchestration-engine.js"]
EOF

    print_status "Docker services created"
}

setup_monitoring() {
    print_status "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    cat > "$PROJECT_ROOT/config/agents/monitoring.yml" << EOF
monitoring:
  metrics:
    collection_interval: 300  # seconds
    retention_period: 30      # days
    
  alerts:
    performance_threshold: 0.7
    error_rate_threshold: 0.1
    response_time_threshold: 5000  # milliseconds
    
  dashboards:
    - name: "Agent Performance"
      panels:
        - agent_task_completion_rate
        - agent_decision_confidence
        - quality_gate_pass_rate
        - optimization_impact
        
    - name: "System Health"
      panels:
        - overall_system_performance
        - error_rates_by_agent
        - resource_utilization
        - team_satisfaction_score

  notifications:
    channels:
      slack:
        enabled: true
        webhook_url: "${SLACK_WEBHOOK_URL}"
        critical_threshold: 0.9
        
      email:
        enabled: true
        smtp_host: "${EMAIL_SMTP_HOST}"
        recipients:
          - "team@company.com"
          - "devops@company.com"
          
      pagerduty:
        enabled: false
        integration_key: ""
EOF

    print_status "Monitoring setup completed"
}

create_management_scripts() {
    print_status "Creating management scripts..."
    
    # Agent control script
    cat > "$PROJECT_ROOT/scripts/agents/control.sh" << 'EOF'
#!/bin/bash

AGENT_CMD="$1"
AGENT_TYPE="$2"

case "$AGENT_CMD" in
    start)
        echo "Starting agent framework..."
        docker-compose -f docker-compose.yml -f docker-compose.agents.yml up -d
        ;;
    stop)
        echo "Stopping agent framework..."
        docker-compose -f docker-compose.yml -f docker-compose.agents.yml down
        ;;
    restart)
        echo "Restarting agent framework..."
        docker-compose -f docker-compose.yml -f docker-compose.agents.yml restart
        ;;
    status)
        echo "Agent framework status:"
        docker-compose -f docker-compose.yml -f docker-compose.agents.yml ps
        ;;
    logs)
        if [ -n "$AGENT_TYPE" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.agents.yml logs -f "$AGENT_TYPE"
        else
            docker-compose -f docker-compose.yml -f docker-compose.agents.yml logs -f
        fi
        ;;
    scale)
        AGENT_COUNT=${3:-2}
        echo "Scaling orchestration engine to $AGENT_COUNT instances..."
        docker-compose -f docker-compose.yml -f docker-compose.agents.yml up -d --scale orchestration-engine="$AGENT_COUNT"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|scale} [agent_type] [count]"
        exit 1
        ;;
esac
EOF

    chmod +x "$PROJECT_ROOT/scripts/agents/control.sh"
    
    # Backup script
    cat > "$PROJECT_ROOT/scripts/agents/backup.sh" << 'EOF'
#!/bin/bash

BACKUP_DIR="/tmp/agent-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating agent framework backup..."

# Backup configuration
cp -r .agents "$BACKUP_DIR/"
cp -r .orchestration "$BACKUP_DIR/"
cp .env.agents "$BACKUP_DIR/"

# Backup database
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --table=agent_tasks --table=agent_decisions --table=agent_performance --table=optimization_history \
    > "$BACKUP_DIR/agent_data.sql"

# Create archive
tar -czf "agent-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C /tmp "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Backup completed: agent-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
EOF

    chmod +x "$PROJECT_ROOT/scripts/agents/backup.sh"
    
    print_status "Management scripts created"
}

setup_git_hooks() {
    print_status "Setting up Git hooks for agent integration..."
    
    # Pre-commit hook
    cat > "$PROJECT_ROOT/.git/hooks/pre-commit" << 'EOF'
#!/bin/bash

# Agent Framework Pre-commit Hook
echo "Running agent framework pre-commit checks..."

# Check if orchestration engine is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    # Submit code review task to agents
    curl -X POST http://localhost:3001/api/tasks \
        -H "Content-Type: application/json" \
        -d '{
            "agent_type": "quality_assurance_agent",
            "task_type": "pre_commit_review",
            "priority": "HIGH",
            "context": {
                "files": ["'$(git diff --cached --name-only | tr '\n' ',' | sed 's/,$//')'""],
                "commit_message": "'"$1"'"
            },
            "estimated_duration": 30
        }' > /dev/null 2>&1
    
    echo "Agent framework notified of incoming commit"
fi

exit 0
EOF

    chmod +x "$PROJECT_ROOT/.git/hooks/pre-commit"
    
    print_status "Git hooks setup completed"
}

run_initial_tests() {
    print_status "Running initial agent framework tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test configuration loading
    node -e "
        const yaml = require('yaml');
        const fs = require('fs');
        try {
            const config = yaml.parse(fs.readFileSync('.agents/config.yaml', 'utf8'));
            console.log('✓ Configuration loaded successfully');
            console.log('✓ Found', Object.keys(config.agents).length, 'configured agents');
        } catch (error) {
            console.error('✗ Configuration test failed:', error.message);
            process.exit(1);
        }
    "
    
    # Test database connectivity
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM agent_tasks;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "✓ Database connectivity test passed"
    else
        print_error "✗ Database connectivity test failed"
        exit 1
    fi
    
    print_status "Initial tests completed successfully"
}

display_deployment_summary() {
    print_header
    
    echo -e "${GREEN}🎉 Agent Framework Deployment Completed Successfully!${NC}"
    echo ""
    echo -e "${BLUE}Configuration Summary:${NC}"
    echo "  • Team Size: $TEAM_SIZE"
    echo "  • Primary Language: $LANGUAGE"
    echo "  • VCS: $VCS_TYPE"
    echo "  • Orchestration: $ORCHESTRATION_PLATFORM"
    echo "  • Notifications: $NOTIFICATION_CHANNEL"
    echo ""
    echo -e "${BLUE}Agent Status:${NC}"
    
    # Count enabled agents
    local enabled_agents=$(grep -c "enabled: true" "$AGENTS_DIR/config.yaml")
    echo "  • Enabled Agents: $enabled_agents"
    echo "  • Current Phase: 1 (Observation & Learning)"
    echo "  • Autonomy Level: Progressive (Starting at 60%)"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Start the agent framework:"
    echo "     ${YELLOW}./scripts/agents/control.sh start${NC}"
    echo ""
    echo "  2. Monitor agent dashboard:"
    echo "     ${YELLOW}http://localhost:3002${NC}"
    echo ""
    echo "  3. View agent logs:"
    echo "     ${YELLOW}./scripts/agents/control.sh logs${NC}"
    echo ""
    echo "  4. Check system status:"
    echo "     ${YELLOW}curl http://localhost:3001/api/status${NC}"
    echo ""
    echo -e "${GREEN}The Enterprise Multi-Agent Orchestration Framework is ready!${NC}"
    echo ""
}

# Main deployment function
main() {
    print_header
    
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Enterprise Multi-Agent Orchestration Framework Deployment"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Environment Variables:"
        echo "  TEAM_SIZE              Team size (default: 5)"
        echo "  LANGUAGE               Primary language (default: typescript)"
        echo "  VCS_TYPE               Version control system (default: git)"
        echo "  ORCHESTRATION_PLATFORM Orchestration platform (default: docker)"
        echo "  NOTIFICATION_CHANNEL   Notification channel (default: slack)"
        echo ""
        echo "Example:"
        echo "  TEAM_SIZE=8 NOTIFICATION_CHANNEL=email $0"
        exit 0
    fi
    
    # Execute deployment steps
    check_prerequisites
    setup_directory_structure
    install_dependencies
    configure_environment
    compile_typescript
    setup_database_schema
    create_docker_services
    setup_monitoring
    create_management_scripts
    setup_git_hooks
    run_initial_tests
    display_deployment_summary
}

# Run main function
main "$@"