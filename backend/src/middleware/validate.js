const { z } = require('zod');

function validate(schema) {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body)
            req.validatedData = validatedData
            next()
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                })
            }

            return res.status(400).json({
                error: 'Validation failed',
                message: error.message
            })
        }
    }
}

module.exports = { validate }
