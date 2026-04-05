const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { UnauthorizedError, ForbiddenError } = require('../utils/errors')

async function authenticate(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided')
        }

        const token = authHeader.substring(7) // Remove 'Bearer ' prefix

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

        if (user.status !== 'Active') {
            throw new UnauthorizedError('Account is not active')
        }

        // Attach user to request
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

// Optional authentication - doesn't fail if no token
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const user = await prisma.member.findUnique({
                where: { id: decoded.id },
                select: { id: true, fullName: true, email: true, username: true, role: true }
            })

            if (user) {
                req.user = user
            }
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
