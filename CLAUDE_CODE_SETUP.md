# Claude Code Agents Setup Guide

A comprehensive guide for setting up specialized agents in Claude Code to automate GIS platform development workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation and Configuration](#installation-and-configuration)
- [Agent Configuration](#agent-configuration)
- [Workflow Templates](#workflow-templates)
- [Spatial Query Templates](#spatial-query-templates)
- [Custom Commands](#custom-commands)
- [Integration Setup](#integration-setup)
- [Automated Tasks](#automated-tasks)
- [Usage Examples](#usage-examples)
- [CI/CD Integration](#cicd-integration)

## Prerequisites

- Node.js 18+ installed
- WSL2 Ubuntu environment
- Anthropic API key
- Existing GIS platform project structure

## Installation and Configuration

### 1. Install Claude Code CLI

```bash
# [WSL2-UBUNTU] - Install Claude Code CLI
npm install -g @anthropic/claude-code

# Configure with your API key
claude-code auth login

# Set model preferences
claude-code config set model claude-3-5-sonnet-20241022
claude-code config set context-window 200000
```

### 2. Project Structure Created

The following structure has been created in your project:

```
.claude-code/
├── agents/                   # Agent configurations
│   ├── gis-spatial-agent.json
│   ├── frontend-spatial-agent.json
│   └── database-spatial-agent.json
├── prompts/                  # Reusable prompts
│   └── spatial-queries.md
├── workflows/                # Workflow templates
│   ├── spatial-api.yaml
│   └── react-component.yaml
├── tasks/                    # Automated tasks
│   ├── daily-dev.json
│   └── weekly-maintenance.json
├── config/                   # Environment configs
│   ├── development.json
│   └── production.json
├── commands.sh              # Custom commands
└── team-settings.json       # Team configurations
```

## Agent Configuration

### Primary GIS Development Agent

**File:** `.claude-code/agents/gis-spatial-agent.json`

Specialized for:
- PostGIS spatial queries and optimization
- React Native Web with MapLibre GL JS
- Node.js/TypeScript with Fastify
- Spatial data processing and vector tiles

### Frontend Spatial Agent

**File:** `.claude-code/agents/frontend-spatial-agent.json`

Specialized for:
- React Native Web components
- MapLibre GL JS integration
- TypeScript for spatial applications
- Performance optimization for map rendering

### Database Spatial Agent

**File:** `.claude-code/agents/database-spatial-agent.json`

Specialized for:
- PostGIS expertise
- Spatial indexing strategies
- Query performance optimization
- Migration scripts

## Workflow Templates

### Spatial API Workflow

**File:** `.claude-code/workflows/spatial-api.yaml`

Generates complete spatial API endpoints including:
- PostGIS table schema with indexes
- Fastify route handlers
- TypeScript types
- Validation logic
- Comprehensive tests
- API documentation

### React Component Workflow

**File:** `.claude-code/workflows/react-component.yaml`

Generates React components with:
- TypeScript interfaces
- MapLibre GL JS integration
- Responsive design
- Error boundaries
- Performance optimizations
- Complete test suites

## Spatial Query Templates

**File:** `.claude-code/prompts/spatial-queries.md`

Pre-built templates for:
- Proximity search
- Vector tile generation
- Spatial intersection
- Clustering
- Spatial aggregation
- Buffer analysis
- Spatial joins
- Geometry validation

## Custom Commands

**File:** `.claude-code/commands.sh`

Available commands:

```bash
# Generate spatial endpoint
./.claude-code/commands.sh spatial-endpoint "requirements"

# Optimize PostGIS query
./.claude-code/commands.sh optimize "query"

# Generate map component
./.claude-code/commands.sh map-component "specs"

# Validate schema
./.claude-code/commands.sh validate-schema schema.sql

# Generate migration
./.claude-code/commands.sh migration "changes"

# Create vector tiles endpoint
./.claude-code/commands.sh tile-endpoint "config"

# Performance audit
./.claude-code/commands.sh audit

# Generate test data
./.claude-code/commands.sh test-data "type" "count"

# Code review
./.claude-code/commands.sh review file1.ts file2.sql

# Generate API docs
./.claude-code/commands.sh api-docs

# Analyze complexity
./.claude-code/commands.sh analyze "query"

# Recommend indexes
./.claude-code/commands.sh indexes schema.sql
```

## Integration Setup

### VS Code Integration

**File:** `.vscode/tasks.json`

VS Code tasks are configured for:
- Generate Spatial Endpoint (Ctrl+Shift+P → Tasks: Run Task)
- Optimize Query
- Generate Map Component

### Cursor Integration

**File:** `.cursorrules`

Updated with Claude Code integration:
- Agent mappings
- Auto-generation settings
- Review triggers
- Optimization focus areas

## Automated Tasks

### Daily Development Tasks

**File:** `.claude-code/tasks/daily-dev.json`

- Code review for spatial code
- Performance audit of queries
- Test generation for uncovered code
- Documentation updates

### Weekly Maintenance Tasks

**File:** `.claude-code/tasks/weekly-maintenance.json`

- Dependency audits
- Performance benchmarks
- Security reviews

## Usage Examples

### Basic Commands

```bash
# Generate a new spatial endpoint
./.claude-code/commands.sh spatial-endpoint "Create endpoint for finding nearby points of interest within 5km radius"

# Optimize existing query
./.claude-code/commands.sh optimize "SELECT * FROM features WHERE ST_DWithin(geom, ST_MakePoint(-73.98, 40.75), 1000)"

# Generate React component
./.claude-code/commands.sh map-component "Interactive map with vector layers and popup functionality"

# Review code changes
./.claude-code/commands.sh review packages/api/src/routes/spatial.ts

# Generate migration
./.claude-code/commands.sh migration "Add spatial index to features table"
```

### Advanced Workflows

```bash
# Interactive session with spatial agent
claude-code chat --agent gis-spatial-agent

# Multi-agent collaboration
claude-code collaborate \
  --agents gis-spatial-agent,frontend-spatial-agent,database-spatial-agent \
  --task "Build complete feature for spatial search"
```

## CI/CD Integration

### GitHub Actions

**File:** `.github/workflows/claude-code-review.yml`

Automated PR reviews including:
- Spatial code analysis
- Performance audits
- Best practice recommendations

### Pre-commit Hooks

**File:** `.husky/pre-commit`

Pre-commit checks for:
- Spatial query optimization
- PostGIS schema validation

## Configuration Management

### Environment Configs

- **Development:** `.claude-code/config/development.json`
- **Production:** `.claude-code/config/production.json`

### Team Settings

**File:** `.claude-code/team-settings.json`

Defines:
- Shared agents
- Code standards
- Review requirements

## Best Practices

1. **Agent Specialization**
   - Use specific agents for specific domains
   - Configure temperature based on task type

2. **Workflow Optimization**
   - Break complex tasks into smaller workflows
   - Use templates for common patterns

3. **Performance Monitoring**
   - Regular audits of generated code
   - Track query execution times

4. **Security**
   - Validate all spatial inputs
   - Regular security audits

5. **Team Collaboration**
   - Shared configurations
   - Consistent standards

## Troubleshooting

### Debug Commands

```bash
# Debug agent configuration
claude-code config list --agent gis-spatial-agent

# Test agent response
claude-code test --agent gis-spatial-agent --prompt "Generate a simple PostGIS query"

# Validate workflow
claude-code workflow validate spatial-api
```

### Common Issues

1. **Agent not responding correctly**
   - Check system prompt configuration
   - Verify model settings

2. **Performance issues**
   - Monitor API usage
   - Optimize prompts

3. **Integration problems**
   - Verify file paths
   - Check environment variables

## Next Steps

1. Set your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

2. Test the setup:
   ```bash
   ./.claude-code/commands.sh optimize "SELECT * FROM features"
   ```

3. Configure your IDE to use the VS Code tasks

4. Set up the GitHub Action by adding `ANTHROPIC_API_KEY` to your repository secrets

5. Initialize husky for pre-commit hooks:
   ```bash
   npx husky install
   ```