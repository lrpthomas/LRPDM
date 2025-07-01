# LRPDM - Live, Reliable, Project, Data & Mapping

A comprehensive GIS web/mobile application that enables field data collection, mapping, and spatial analysis with offline-first capabilities.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup database (PostgreSQL + PostGIS)
./setup-database.sh

# Run migrations
pnpm run db:migrate

# Start development servers
pnpm run dev          # Backend API (port 3000)
pnpm run web:serve    # Frontend web app (port 3001)
```

## 📋 Project Status

✅ **Current Features**
- Interactive mapping with MapLibre GL JS
- Spatial data upload (CSV, Excel, Shapefile, GeoJSON)
- Real-time spatial queries and analysis
- Virtual scrolling for large datasets
- Responsive mobile-first design
- Offline-first architecture ready

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js 22.11.0, Express, PostGIS 16-3.4
- **Frontend**: React Native Web, MapLibre GL JS
- **Database**: PostgreSQL 16 with PostGIS 3.4 extensions
- **Package Manager**: PNPM workspaces
- **Infrastructure**: Docker, Kubernetes ready

### Project Structure
```
gis-platform/
├── src/              # Backend API with PostGIS integration
├── apps/web-app/     # React Native Web app
├── tests/            # Test suites
├── .github/          # CI/CD workflows
├── orchestration/    # Quality gates and automation
└── docs/             # Documentation
```

## 🔒 Security & Quality

### Security Scanning
- **Dependency Scanning**: npm audit + Snyk
- **Code Analysis**: GitHub CodeQL
- **Secret Detection**: TruffleHog
- **Security Headers**: Helmet.js configuration

```bash
# Run security scans
pnpm run security:audit
pnpm run security:scan
```

### Performance Benchmarks
- **Spatial queries**: < 2 seconds for 100k features
- **Map tile generation**: < 500ms per tile
- **File upload processing**: < 30 seconds for 10MB CSV
- **Test coverage**: 85% minimum requirement

```bash
# Run performance tests
pnpm run test:performance
pnpm run test:spatial:performance
```

### Test Coverage
- **Unit Tests**: 85% line coverage required
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows
- **Performance Tests**: Load testing for spatial queries

```bash
# Run test suite
pnpm test
pnpm run test:coverage
pnpm run test:unit
```

## 🔧 Development

### Available Scripts
```bash
# Development
pnpm run dev          # Start backend API
pnpm run web:serve    # Start frontend dev server
pnpm run build        # Build TypeScript

# Testing
pnpm test            # Run all tests
pnpm run test:coverage    # Run tests with coverage
pnpm run test:unit        # Unit tests only
pnpm run test:performance # Performance benchmarks

# Database
pnpm run db:migrate      # Run migrations
pnpm run db:rollback     # Rollback migrations
pnpm run db:seed         # Seed test data

# Quality
pnpm run lint           # Code linting
pnpm run type-check     # TypeScript checking
pnpm run security:audit # Security audit
```

### Environment Setup
```bash
# Required environment variables
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gis_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## 🚦 CI/CD Workflows

### Quality Gates
- ✅ **Build Validation**: TypeScript compilation
- ✅ **Security Scan**: Dependency & code analysis
- ✅ **Test Coverage**: 85% minimum requirement
- ✅ **Performance Benchmarks**: Spatial query optimization
- ✅ **Code Quality**: Linting and formatting

### Automated Workflows
- **Security Scan**: On every push and weekly schedule
- **Performance Tests**: On PR and main branch
- **Test Coverage**: Required for all contributions
- **Dependency Updates**: Automated via Dependabot

## 📊 Monitoring

### Performance Monitoring
- **Prometheus**: Time-series metrics collection
- **Grafana**: Performance dashboards
- **Database**: Query performance statistics
- **APM**: Application performance monitoring

### Key Metrics
- Response time P95: < 500ms
- Error rate: < 0.1%
- Database queries: < 2s for spatial operations
- Memory usage: < 512MB baseline

## 🎯 Standards & Guidelines

### Code Quality
- **TypeScript**: Strict mode enabled
- **Testing**: 85% coverage requirement
- **Security**: No secrets in code, parameterized queries
- **Performance**: Spatial index optimization

### Git Workflow
```bash
# Branch naming
feature/week{n}-{component}-{description}
bugfix/issue-{number}-{description}

# Commit format
feat(map): add cluster layer for point features [TASK-2-3]
fix(offline): resolve sync conflict [TASK-3-5]
```

## 📚 Documentation

- [Development Guidelines](CLAUDE.md)
- [Security Configuration](SECURITY.md)
- [Performance Benchmarks](PERFORMANCE.md)
- [Quality Review Process](QRA-INSTRUCTIONS.md)
- [Database Setup](setup-database.md)
- [Map Integration](setup-map-integration.md)

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Ensure** 85% test coverage
4. **Pass** all security scans
5. **Submit** a pull request

### Quality Requirements
- [ ] All tests passing with 85% coverage
- [ ] Security scan completed successfully
- [ ] Performance benchmarks within thresholds
- [ ] Code follows project standards
- [ ] Documentation updated

## 📄 License

This project is part of the LRPDM platform development.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: `/docs` directory
- **Performance**: See `PERFORMANCE.md`
- **Security**: See `SECURITY.md`