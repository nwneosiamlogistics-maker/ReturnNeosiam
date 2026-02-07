
/**
 * Formats a date string to DD/MM/YYYY format.
 * @param dateInput The date string or object to format.
 * @returns The formatted date string in DD/MM/YYYY format, or an empty string if invalid.
 */
export const formatDate = (dateInput?: string | Date | null): string => {
    if (!dateInput) return '-';

    const date = new Date(dateInput);

    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};
