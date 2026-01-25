/**
 * Common utility functions for the FinancialAdvisor system
 */
/**
 * Format currency amount with proper locale and currency symbol
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    }).format(amount);
}
/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value, decimals = 2) {
    return `${(value * 100).toFixed(decimals)}%`;
}
/**
 * Parse a date string or Date object into a Date
 */
export function parseDate(date) {
    return typeof date === 'string' ? new Date(date) : date;
}
/**
 * Check if a date is within a given range
 */
export function isDateInRange(date, range) {
    return date >= range.start && date <= range.end;
}
/**
 * Generate a unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Calculate the number of days between two dates
 */
export function daysBetween(start, end) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
/**
 * Get the start and end of a month for a given date
 */
export function getMonthRange(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
}
/**
 * Get the start and end of a year for a given date
 */
export function getYearRange(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return { start, end };
}
/**
 * Round a number to specified decimal places
 */
export function roundToDecimals(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(principal, rate, timeInYears, compoundingFrequency = 12) {
    return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * timeInYears);
}
/**
 * Validate email format
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Sanitize string for use in filenames
 */
export function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Debounce function calls
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
/**
 * Throttle function calls
 */
export function throttle(func, delay) {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}
/**
 * Group array elements by a key function
 */
export function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}
/**
 * Calculate moving average
 */
export function movingAverage(values, windowSize) {
    if (windowSize >= values.length) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        return new Array(values.length).fill(avg);
    }
    const result = [];
    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const end = i + 1;
        const slice = values.slice(start, end);
        const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
        result.push(avg);
    }
    return result;
}
