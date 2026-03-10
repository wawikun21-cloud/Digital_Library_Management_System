/**
 * API Error Class
 * Custom error class for consistent API error handling
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} isOperational - Whether this is an operational error
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message = "Bad Request") {
    return new ApiError(400, message);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message = "Not Found") {
    return new ApiError(404, message);
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  /**
   * Create a 422 Unprocessable Entity error
   */
  static unprocessable(message = "Unprocessable Entity") {
    return new ApiError(422, message);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message = "Internal Server Error") {
    return new ApiError(500, message, false);
  }
}

module.exports = ApiError;

