const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// ─── Log directory ────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ─── Custom token: request body (sanitised — never log passwords) ─────────────
morgan.token('body', (req) => {
    if (!req.body || Object.keys(req.body).length === 0) return '-';
    const safe = { ...req.body };
    // Redact sensitive fields
    ['password', 'passwordHash', 'newPassword', 'token', 'resetToken', 'otp'].forEach(k => {
        if (safe[k]) safe[k] = '[REDACTED]';
    });
    return JSON.stringify(safe);
});

// ─── Custom token: authenticated user id ─────────────────────────────────────
morgan.token('user-id', (req) => req.user?.id ?? 'guest');

// ─── Custom token: response time coloured for dev ────────────────────────────
morgan.token('status-colored', (req, res) => {
    const status = res.statusCode;
    if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // red
    if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // yellow
    if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // cyan
    return `\x1b[32m${status}\x1b[0m`;                     // green
});

// ─── Formats ──────────────────────────────────────────────────────────────────

// Development: coloured, concise, includes body
const devFormat =
    ':method :url :status-colored :response-time ms — user::user-id — body::body';

// Production: structured, machine-readable, written to file
const prodFormat = JSON.stringify({
    time:     ':date[iso]',
    method:   ':method',
    url:      ':url',
    status:   ':status',
    ms:       ':response-time',
    ip:       ':remote-addr',
    userId:   ':user-id',
    referrer: ':referrer',
    ua:       ':user-agent',
});

// ─── Build and export the middleware ─────────────────────────────────────────
function buildMorganMiddleware() {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
        // Rotate-friendly: one file per day  (access-2026-04-15.log)
        const today = new Date().toISOString().slice(0, 10);
        const logFile = path.join(logsDir, `access-${today}.log`);
        const stream = fs.createWriteStream(logFile, { flags: 'a' });

        return morgan(prodFormat, {
            stream,
            // Skip health-check noise in production logs
            skip: (req) => req.url === '/health',
        });
    }

    // Development: log to stdout, skip nothing
    return morgan(devFormat);
}

module.exports = buildMorganMiddleware;
