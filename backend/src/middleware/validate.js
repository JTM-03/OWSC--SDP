const { z } = require('zod')
const { sanitizeObject } = require('../utils/sanitize')

/**
 * Password fields must never be sanitized — HTML-escaping them before bcrypt
 * hashing would corrupt the hash and break login for passwords containing
 * characters like &, <, >, ", or '.
 */
const SKIP_SANITIZE = new Set(['password', 'newPassword', 'confirmPassword', 'currentPassword'])

/**
 * Middleware factory that sanitizes and validates req.body against a Zod schema.
 *
 * Flow:
 *   1. Sanitize all non-password fields (trim, strip XSS)
 *   2. Parse the sanitized data through the Zod schema
 *   3. Attach sanitizedData and validatedData to req for use in controllers
 *   4. Return a structured 400 on validation failure
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            // Default to empty object — req.body can be undefined when multer
            // hasn't parsed the body yet or Content-Type is unexpected
            const raw = req.body || {}

            // Sanitize each field individually, skipping password fields
            const sanitizedData = {}
            for (const [key, value] of Object.entries(raw)) {
                sanitizedData[key] = SKIP_SANITIZE.has(key) ? value : sanitizeObject(value)
            }

            // Run Zod validation — throws ZodError on failure
            const validatedData = schema.parse(sanitizedData)

            // Attach both to req so controllers can use either
            req.sanitizedData = sanitizedData   // raw sanitized (pre-transform)
            req.validatedData = validatedData   // fully validated + transformed

            next()
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Return structured field-level errors for the frontend to display
                return res.status(400).json({
                    error: 'Validation failed',
                    details: (error.errors || []).map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                })
            }

            // Unexpected error during sanitization or parsing
            return res.status(400).json({
                error: 'Validation failed',
                message: error?.message || 'Invalid request data'
            })
        }
    }
}

module.exports = { validate }
