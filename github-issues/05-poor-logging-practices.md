# [QUALITY] Poor Logging Practices - Replace console.log with Structured Logging

## 📝 Code Quality Issue

**Priority**: Medium

**Category**: 
- [ ] Type Safety
- [ ] Error Handling
- [ ] Performance
- [x] Maintainability
- [ ] Testing
- [ ] Documentation
- [ ] Architecture

## 📍 Location
**File(s)**: 70+ occurrences across the codebase
- `src/server.ts:10,15,21-30`
- `src/services/OptimizedPostGISService.ts:96`
- `src/scripts/spatial-performance-audit.ts:57,76,82,135,207,253,310,354,386,430,460,487,491-519`
- `src/routes/tasks-simple.ts:17,43,72,103,131`
- And many more test and utility files

**Code snippet**:
```typescript
// Current problematic logging
console.log(`🚀 GIS Platform API running on port ${PORT}`);
console.error('⚠️  Database connection failed. Server will start but database features will be unavailable.');
console.log(`Proximity query executed in ${queryTime}ms`);
console.error('Get tasks error:', error);
```

## ❌ Problem Description
The codebase extensively uses `console.log` and `console.error` for logging, which is problematic for production applications:

- **No log levels**: Can't filter logs by severity
- **No structured data**: Logs are just strings, hard to parse/analyze
- **No log rotation**: Console logs aren't managed
- **Poor production monitoring**: Can't integrate with log aggregation systems
- **Performance impact**: Console logging can be slow in production
- **No context**: Missing request IDs, user context, etc.

## ✅ Proposed Solution
Implement a proper logging system using a structured logging library:

```typescript
// Install winston or pino for structured logging
npm install winston

// Create a logger service
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ]
});

// Usage example
// Instead of: console.log(`🚀 GIS Platform API running on port ${PORT}`);
logger.info('GIS Platform API started', { 
  port: PORT, 
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Instead of: console.error('Get tasks error:', error);
logger.error('Failed to get tasks', { 
  error: error.message, 
  stack: error.stack,
  userId: req.user?.id,
  requestId: req.id
});
```

## 🎯 Benefits
- **Structured logging**: JSON format for easy parsing
- **Log levels**: Debug, info, warn, error for filtering
- **Production ready**: File rotation, log aggregation support
- **Better debugging**: Contextual information with each log
- **Performance**: Configurable log levels
- **Monitoring integration**: Works with ELK stack, Splunk, etc.

## 📋 Acceptance Criteria
- [ ] Logging library (winston/pino) is installed and configured
- [ ] All `console.log` calls are replaced with appropriate log levels
- [ ] All `console.error` calls use structured error logging
- [ ] Log configuration supports different environments
- [ ] Request context (user ID, request ID) is included in logs
- [ ] Log rotation is configured for production
- [ ] Documentation on logging standards is created

## 🎯 Implementation Plan
1. **Setup**: Install and configure logging library
2. **Core services**: Replace logging in server.ts, database.ts
3. **API routes**: Add structured logging to all route handlers
4. **Services**: Update service layer logging
5. **Error handling**: Integrate with error handling middleware
6. **Documentation**: Create logging guidelines

## 🔗 Related Issues
- This should be implemented alongside proper error handling middleware
- Consider adding request ID middleware for better tracing