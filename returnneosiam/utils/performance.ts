/**
 * Performance Utilities
 * Based on Vercel React Best Practices Skill
 */

/**
 * Debounce function for input handlers
 * Prevents excessive re-renders on rapid input changes
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for scroll/resize handlers
 * Limits function calls to once per specified interval
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize function results for expensive computations
 * Based on js-cache-function-results rule
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }

    const result = func(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a Set for O(1) lookups
 * Based on js-set-map-lookups rule
 */
export function createLookupSet<T>(items: T[]): Set<T> {
  return new Set(items);
}

/**
 * Create a Map for O(1) lookups by key
 * Based on js-set-map-lookups rule
 */
export function createLookupMap<T, K extends keyof T>(
  items: T[],
  keyField: K
): Map<T[K], T> {
  const map = new Map<T[K], T>();
  for (const item of items) {
    map.set(item[keyField], item);
  }
  return map;
}

/**
 * Batch DOM operations for better performance
 * Based on js-batch-dom-css rule
 */
export function batchDOMUpdates(callback: () => void): void {
  requestAnimationFrame(() => {
    callback();
  });
}

/**
 * Check if element is in viewport (for lazy loading)
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Format number with locale (cached)
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale = 'th-TH'): string {
  if (!numberFormatCache.has(locale)) {
    numberFormatCache.set(locale, new Intl.NumberFormat(locale));
  }
  return numberFormatCache.get(locale)!.format(value);
}

/**
 * Format currency with locale (cached)
 */
const currencyFormatCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  value: number,
  currency = 'THB',
  locale = 'th-TH'
): string {
  const key = `${locale}-${currency}`;
  if (!currencyFormatCache.has(key)) {
    currencyFormatCache.set(
      key,
      new Intl.NumberFormat(locale, { style: 'currency', currency })
    );
  }
  return currencyFormatCache.get(key)!.format(value);
}

/**
 * Format date with locale (cached)
 */
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  },
  locale = 'th-TH'
): string {
  const key = `${locale}-${JSON.stringify(options)}`;
  if (!dateFormatCache.has(key)) {
    dateFormatCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFormatCache.get(key)!.format(dateObj);
}
