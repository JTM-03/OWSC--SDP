export const PoyaDates2026 = [
    "2026-01-03",
    "2026-02-01",
    "2026-03-03",
    "2026-04-01",
    "2026-05-01",
    "2026-05-31",
    "2026-06-29",
    "2026-07-28",
    "2026-08-27",
    "2026-09-25",
    "2026-10-25",
    "2026-11-23",
    "2026-12-23"
];

/** Returns today's date string as YYYY-MM-DD in local time. */
function todayStr(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Returns true if the date is strictly in the past (before today). */
export function isPastDate(dateStringOrObj: string | Date | null | undefined): boolean {
    if (!dateStringOrObj) return false;
    // Compare date strings in local time to avoid timezone shifts
    let dateStr: string;
    if (typeof dateStringOrObj === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStringOrObj)) {
        dateStr = dateStringOrObj;
    } else {
        const d = new Date(dateStringOrObj);
        if (isNaN(d.getTime())) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateStr = `${yyyy}-${mm}-${dd}`;
    }
    return dateStr < todayStr();
}

export function isRestrictedDate(dateStringOrObj: string | Date | null | undefined): boolean {
    if (!dateStringOrObj) return false;
    const date = new Date(dateStringOrObj);
    if (isNaN(date.getTime())) return false;
    
    if (date.getDay() === 0) return true;
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    return PoyaDates2026.includes(dateStr);
}

/** Returns a human-readable reason why the date is restricted, or null if it's allowed. */
export function getRestrictionReason(dateStringOrObj: string | Date | null | undefined): string | null {
    if (!dateStringOrObj) return null;

    if (isPastDate(dateStringOrObj)) {
        return "Bookings cannot be made for past dates.";
    }

    const date = new Date(dateStringOrObj);
    if (isNaN(date.getTime())) return null;

    if (date.getDay() === 0) return "The club is closed on Sundays.";

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    if (PoyaDates2026.includes(`${yyyy}-${mm}-${dd}`)) {
        return "The club is closed on Poya (Full Moon) days.";
    }

    return null;
}
