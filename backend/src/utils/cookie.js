/**
 * Shared cookie configuration for the auth token.
 * Import setTokenCookie / clearTokenCookie in any route that issues or revokes a token.
 */

const COOKIE_NAME = 'token';

/**
 * Cookie options.
 * - httpOnly  : JS cannot read the cookie → XSS-safe
 * - secure    : only sent over HTTPS (disabled in development)
 * - sameSite  : 'lax' allows normal navigation; use 'none' only if frontend/backend are on different domains AND secure=true
 * - maxAge    : mirrors JWT_EXPIRES_IN (7 days in ms)
 */
function cookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',                              // ensure cookie is sent for all paths
        maxAge: 7 * 24 * 60 * 60 * 1000        // 7 days in milliseconds
    };
}

/** Attach the JWT as an HttpOnly cookie on the response */
function setTokenCookie(res, token) {
    res.cookie(COOKIE_NAME, token, cookieOptions());
}

/** Clear the auth cookie (logout) */
function clearTokenCookie(res) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
}

module.exports = { setTokenCookie, clearTokenCookie, COOKIE_NAME };
