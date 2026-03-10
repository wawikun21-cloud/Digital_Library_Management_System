/**
 * Response Formatter Utility
 * Consistent API response formatting
 */

/**
 * Success response
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const successResponse = (data = null, message = null, statusCode = 200) => {
  const response = {
    success: true,
    statusCode,
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  return response;
};

/**
 * Error response
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {any} details - Optional error details
 */
const errorResponse = (error = "Internal Server Error", statusCode = 500, details = null) => {
  const response = {
    success: false,
    statusCode,
    error,
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV === "development") {
    response.stack = new Error().stack;
  }

  return response;
};

/**
 * Paginated response
 * @param {Array} data - Array of items
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
const paginatedResponse = (data, total, page = 1, limit = 20) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Created response (201)
 * @param {any} data - Created resource data
 * @param {string} message - Success message
 */
const createdResponse = (data, message = "Resource created successfully") => {
  return successResponse(data, message, 201);
};

/**
 * No content response (204)
 */
const noContentResponse = () => {
  return {
    success: true,
    statusCode: 204,
  };
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};

