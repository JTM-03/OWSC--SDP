const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { UnauthorizedError, ForbiddenError } = require('../utils/errors')

/**
 * Authenticate a request by verifying the JWT.
 * Reads the token from the HttpOnly cookie first, then falls back to the
 * Authorization: Bearer header for API clients that can't use cookies.
 * Attaches the full user record to req.user on success.
 * Blocks Suspended and Inactive accounts; Pending members are allowed through
 * so they can view their profile while awaiting membership approval.
 */
async function authenticate(req, res, next) {
    try {
        // Read token from HttpOnly cookie first, fall back to Authorization header
        const token = req.cookies?.token
            || (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.substring(7)
                : null)

        if (!token) {
            throw new UnauthorizedError('No token provided')
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Fetch user from database
        const user = await prisma.member.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                role: true,
                status: true
            }
        })

        if (!user) {
            throw new UnauthorizedError('User not found')
        }

        // Only block explicitly suspended or inactive accounts.
        // 'Pending' members can still log in — they just won't have an active membership.
        // Admin approves their membership separately; blocking login here is too aggressive.
        if (user.status === 'Suspended' || user.status === 'Inactive') {
            throw new UnauthorizedError('Account has been suspended or deactivated')
        }

        req.user = user
        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new UnauthorizedError('Invalid token'))
        } else if (error.name === 'TokenExpiredError') {
            next(new UnauthorizedError('Token expired'))
        } else {
            next(error)
        }
    }
}

/**
 * Role-based access control middleware factory.
 * Returns a middleware that allows only users with one of the specified roles.
 * Must be used after authenticate() so req.user is populated.
 * @param {...string} allowedRoles - Roles permitted to access the route
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'))
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ForbiddenError(`Access restricted to ${allowedRoles.join(', ')} only`))
        }

        next()
    }
}

/**
 * Optional authentication — attaches req.user if a valid token is present,
 * but does not fail the request if no token is provided or the token is invalid.
 * Useful for routes that serve different content to authenticated vs. anonymous users.
 */
async function optionalAuth(req, res, next) {
    try {
        const token = req.cookies?.token
            || (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.substring(7)
                : null)

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await prisma.member.findUnique({
                where: { id: decoded.id },
                select: { id: true, fullName: true, email: true, username: true, role: true }
            })
            if (user) req.user = user
        }
    } catch (error) {
        // Silently fail for optional auth
    }
    next()
}

module.exports = {
    authenticate,
    requireRole,
    optionalAuth
}
