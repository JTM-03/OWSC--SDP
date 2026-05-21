/**
 * Custom error classes for the OWSC API.
 *
 * All errors extend AppError which carries an HTTP statusCode and an
 * isOperational flag. The global error handler uses isOperational to
 * distinguish expected business errors (4xx) from unexpected crashes (5xx).
 *
 * Usage:
 *   throw new NotFoundError('Venue not found')
 *   throw new BadRequestError('Cannot book on a Poya day')
 */

class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message
     * @param {number} statusCode - HTTP status code to send in the response
     */
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true  // marks this as an expected, handled error
        Error.captureStackTrace(this, this.constructor)
    }
}

/** 404 — The requested resource does not exist */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404)
    }
}

/** 401 — The request lacks valid authentication credentials */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401)
    }
}

/** 403 — The authenticated user does not have permission for this action */
class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403)
    }
}

/** 400 — Input failed schema or business-rule validation */
class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400)
    }
}

/** 409 — A unique constraint was violated (e.g. duplicate email) */
class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409)
    }
}

/** 400 — General bad request (invalid parameters, business rule violation) */
class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400)
    }
}

module.exports = {
    AppError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    ConflictError,
    BadRequestError
}
