const { z } = require('zod');
const { sanitizeObject } = require('../utils/sanitize');

// Fields that must never be sanitized (sanitizing would corrupt them before hashing)
const SKIP_SANITIZE = new Set(['password', 'newPassword', 'confirmPassword', 'currentPassword']);

function validate(schema) {
    return (req, res, next) => {
        try {
            // req.body may be undefined when multer hasn't run yet or the
            // Content-Type is unexpected — default to empty object to avoid
            // "Cannot read properties of undefined (reading 'entries')"
            const raw = req.body || {};

            const sanitizedData = {};
            for (const [key, value] of Object.entries(raw)) {
                sanitizedData[key] = SKIP_SANITIZE.has(key) ? value : sanitizeObject(value);
            }

            const validatedData = schema.parse(sanitizedData);

            req.sanitizedData = sanitizedData;
            req.validatedData = validatedData;

            next();
        } catch (error) {
            // ZodError — structured field-level validation failure
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: (error.errors || []).map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }

            // Any other error (TypeError, etc.) — return a safe generic message
            return res.status(400).json({
                error: 'Validation failed',
                message: error?.message || 'Invalid request data'
            });
        }
    };
}

module.exports = { validate };
