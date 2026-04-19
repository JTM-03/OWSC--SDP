/**
 * Pagination Utility
 * Parses page/limit from query params and returns Prisma-compatible skip/take
 * plus a standard meta object for responses.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination params from req.query
 * @param {object} query - req.query
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
function parsePagination(query) {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT));
    const skip  = (page - 1) * limit;
    return { skip, take: limit, page, limit };
}

/**
 * Build a standard pagination meta block
 * @param {number} total  - total record count
 * @param {number} page   - current page
 * @param {number} limit  - page size
 * @returns {{ total, page, limit, totalPages, hasNext, hasPrev }}
 */
function paginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

module.exports = { parsePagination, paginationMeta, DEFAULT_LIMIT, MAX_LIMIT };
