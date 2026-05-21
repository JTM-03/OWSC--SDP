/**
 * Global Express error handler — must be registered last in app.js.
 * Translates operational errors (AppError subclasses) and Prisma errors
 * into consistent JSON responses. Logs 500s to the filesystem.
 */
function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500
    let message = err.message || 'Internal server error'

    // ─── Prisma error mapping ─────────────────────────────────────────────────
    if (err.code === 'P2002') {
        // Unique constraint violation — e.g. duplicate email or username
        statusCode = 409
        message = `${err.meta?.target?.[0] || 'Field'} already exists`
    } else if (err.code === 'P2025') {
        // Record not found — e.g. update/delete on a non-existent row
        statusCode = 404
        message = 'Resource not found'
    } else if (err.code?.startsWith('P')) {
        // Any other Prisma error (constraint, connection, etc.)
        statusCode = 400
        message = 'Database operation failed'
    }

    // ─── Logging ──────────────────────────────────────────────────────────────
    if (statusCode === 500) {
        // Write unexpected errors to a persistent log file for post-mortem debugging
        try {
            const fs = require('fs')
            const path = require('path')
            const logDir = path.join(__dirname, '../../logs')
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
            const logMsg = `\n[${new Date().toISOString()}] 500 ERROR: ${req.method} ${req.originalUrl}\n${err.stack}\n`
            fs.appendFileSync(path.join(logDir, 'global_error.log'), logMsg)
        } catch (filesErr) {
            console.error('Failed to write to log file:', filesErr)
        }

        console.error('❌ Internal Server Error:')
        console.error('   URL:', req.method, req.originalUrl)
        console.error('   Error:', err.message)
        console.error('   Stack:', err.stack)
    } else {
        // Operational errors (4xx) are expected — log at warn level only
        console.log(`⚠️  ${statusCode} Error: ${message} [${req.method} ${req.originalUrl}]`)
    }

    // ─── Response ─────────────────────────────────────────────────────────────
    res.status(statusCode).json({
        error: message,
        // Include stack trace in development to aid debugging; never in production
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
}

module.exports = errorHandler
