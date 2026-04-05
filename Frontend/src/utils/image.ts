
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace(/\/api\/+$/, '').replace(/\/api$/, '');

/**
 * Resolves a potentially relative image path to a full URL.
 * @param path The image path (e.g., "uploads/image.jpg", "/uploads/image.jpg", or "http://...")
 * @returns The full URL to the image.
 */
export const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return "";

    // If it's already a full URL or data URI, return as is
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // Remove leading slash for consistency
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // If the path doesn't start with 'uploads/', assume it belongs in the uploads directory
    // This handles cases where only the filename was stored (e.g. "image.jpg")
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }

    return `${SERVER_URL}/${cleanPath}`;
};
