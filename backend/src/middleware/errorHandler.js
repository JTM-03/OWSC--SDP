function errorHandler(err, req, res, next) {
    // Default error status and message
    let statusCode = err.statusCode || 500
    let message = err.message || 'Internal server error'

    // Handle Prisma errors
    if (err.code === 'P2002') {
        statusCode = 409
        message = `${err.meta?.target?.[0] || 'Field'} already exists`
    } else if (err.code === 'P2025') {
        statusCode = 404
        message = 'Resource not found'
    } else if (err.code?.startsWith('P')) {
        statusCode = 400
        message = 'Database operation failed'
    }

    // Log error for debugging
    // Log error for debugging
    if (statusCode === 500) {
        try {
            const fs = require('fs');
            const logMsg = `\n[${new Date().toISOString()}] 500 ERROR: ${req.method} ${req.originalUrl}\n${err.stack}\n`;
            fs.appendFileSync('global_error.log', logMsg);
        } catch (filesErr) {
            console.error('Failed to write to log file:', filesErr);
        }

        console.error('❌ Internal Server Error:')
        console.error('   URL:', req.method, req.originalUrl)
        console.error('   Error:', err.message)
        console.error('   Stack:', err.stack)
        console.error('   Full Error:', err)
    } else {
        console.log(`⚠️  ${statusCode} Error: ${message} [${req.method} ${req.originalUrl}]`)
    }

    // Send error response
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
}

module.exports = errorHandler
