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
