/**
 * Error Classes untuk Auth SDK
 */

export class AuthError extends Error {
  code?: string;
  statusCode?: number;
  errors?: Array<{ field: string; message: string; code: string }>;

  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    errors?: Array<{ field: string; message: string; code: string }>,
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class AuthenticationError extends AuthError {
  constructor(message = 'Authentication failed', statusCode = 401) {
    super(message, 'AUTHENTICATION_ERROR', statusCode);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AuthError {
  constructor(
    message = 'Validation failed',
    errors?: Array<{ field: string; message: string; code: string }>,
  ) {
    super(message, 'VALIDATION_ERROR', 422, errors);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AuthError {
  constructor(message = 'Network request failed', statusCode = 0) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends AuthError {
  constructor(message = 'Resource not found', statusCode = 404) {
    super(message, 'NOT_FOUND', statusCode);
    this.name = 'NotFoundError';
  }
}
