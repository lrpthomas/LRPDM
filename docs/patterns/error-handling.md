# Error Handling Patterns

## API Error Types
```typescript
enum ErrorType {
  VALIDATION = 'validation',
  SPATIAL = 'spatial', 
  DATABASE = 'database',
  FILE_PROCESSING = 'file_processing',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit'
}

interface APIError {
  type: ErrorType;
  message: string;
  field?: string; // for validation errors
  code: string;
  details?: Record<string, any>;
}