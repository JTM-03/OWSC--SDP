
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SERVER_URL = (() => {
    const stripped = API_URL.replace(/\/api\/+$/, '').replace(/\/api$/, '');
    return stripped === '' || stripped === '/' ? '' : stripped;
})();

/** Decode HTML entities repeatedly until stable (handles double-encoding). */
function decodeEntities(str: string): string {
    let prev = '';
    let current = str;
    while (current !== prev) {
        prev = current;
        current = current
            .replace(/&amp;/gi, '&')
            .replace(/&#x2F;/gi, '/')
            .replace(/&#47;/g, '/')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#x27;/gi, "'");
    }
    return current;
}

/**
 * Resolves a potentially relative image path to a full URL.
 * Returns null when no valid path is provided so callers can use ?? or ||.
 * Automatically decodes any HTML-entity-encoded paths (e.g. &#x2F; → /).
 */
export const getImageUrl = (path: string | null | undefined): string | null => {
    if (
        path === null ||
        path === undefined ||
        typeof path !== 'string' ||
        path.trim() === '' ||
        path === 'undefined' ||
        path === 'null'
    ) return null;

    // Decode any HTML entities before processing
    const decoded = decodeEntities(path.trim());

    // After decoding, reject anything that is still just '&' or empty
    if (decoded === '' || decoded === '&') return null;

    // Already a full URL or data URI — return as-is
    if (decoded.startsWith('http') || decoded.startsWith('data:')) return decoded;

    // Normalise: strip leading slash
    let cleanPath = decoded.startsWith('/') ? decoded.slice(1) : decoded;

    // Ensure it lives under uploads/
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }

    return `${SERVER_URL}/${cleanPath}`;
};

/**
 * Same as getImageUrl — alias kept for href/download links.
 * Returns null when path is invalid.
 */
export const getFileUrl = (path: string | null | undefined): string | null => {
    return getImageUrl(path);
};
