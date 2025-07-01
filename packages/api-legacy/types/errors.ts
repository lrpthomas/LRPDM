export enum ErrorType {
  VALIDATION = 'validation',
  SPATIAL = 'spatial',
  DATABASE = 'database',
  FILE_PROCESSING = 'file_processing',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  PERMISSION = 'permission'
}

export interface APIError {
  type: ErrorType;
  message: string;
  field?: string; // for validation errors
  code: string;
  details?: Record<string, any>;
  timestamp?: string;
  requestId?: string;
}

export interface ErrorResponse {
  error: APIError;
  success: false;
}

export interface ValidationError extends APIError {
  type: ErrorType.VALIDATION;
  field: string;
  value?: any;
  constraints?: string[];
}

export interface SpatialError extends APIError {
  type: ErrorType.SPATIAL;
  geometryField?: string;
  spatialOperation?: string;
  originalGeometry?: string;
}

export interface DatabaseError extends APIError {
  type: ErrorType.DATABASE;
  query?: string;
  table?: string;
  constraint?: string;
}

export interface FileProcessingError extends APIError {
  type: ErrorType.FILE_PROCESSING;
  filename?: string;
  fileSize?: number;
  processingStage?: 'upload' | 'validation' | 'parsing' | 'conversion';
}

// Error factory functions
export class ErrorFactory {
  static validation(message: string, field: string, code: string, details?: Record<string, any>): ValidationError {
    return {
      type: ErrorType.VALIDATION,
      message,
      field,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static spatial(message: string, code: string, details?: Record<string, any>): SpatialError {
    return {
      type: ErrorType.SPATIAL,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static database(message: string, code: string, details?: Record<string, any>): DatabaseError {
    return {
      type: ErrorType.DATABASE,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static fileProcessing(message: string, code: string, details?: Record<string, any>): FileProcessingError {
    return {
      type: ErrorType.FILE_PROCESSING,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static generic(type: ErrorType, message: string, code: string, details?: Record<string, any>): APIError {
    return {
      type,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }
}

// Error handling utilities
export class ErrorHandler {
  static formatForClient(error: APIError): ErrorResponse {
    return {
      error: {
        ...error,
        timestamp: error.timestamp || new Date().toISOString()
      },
      success: false
    };
  }

  static getHttpStatusCode(errorType: ErrorType): number {
    switch (errorType) {
      case ErrorType.VALIDATION:
        return 400;
      case ErrorType.AUTHENTICATION:
        return 401;
      case ErrorType.PERMISSION:
        return 403;
      case ErrorType.RATE_LIMIT:
        return 429;
      case ErrorType.DATABASE:
      case ErrorType.SPATIAL:
      case ErrorType.FILE_PROCESSING:
        return 500;
      case ErrorType.NETWORK:
        return 502;
      default:
        return 500;
    }
  }

  static isRetryable(errorType: ErrorType): boolean {
    return [ErrorType.NETWORK, ErrorType.DATABASE].includes(errorType);
  }
}