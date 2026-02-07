import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for localStorage with versioning and schema validation
 * Based on Vercel React Best Practices - client-localstorage-schema
 */

interface StorageOptions<T> {
  version?: number;
  validator?: (value: unknown) => value is T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { version = 1, validator } = options;
  const versionedKey = `${key}_v${version}`;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(versionedKey);
      if (item === null) {
        return initialValue;
      }

      const parsed = JSON.parse(item);
      
      if (validator && !validator(parsed)) {
        console.warn(`[useLocalStorage] Invalid data for key "${key}", using initial value`);
        return initialValue;
      }

      return parsed as T;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  }, [versionedKey, initialValue, validator, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(versionedKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error setting key "${key}":`, error);
    }
  }, [versionedKey, storedValue, key]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(versionedKey);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`[useLocalStorage] Error removing key "${key}":`, error);
    }
  }, [versionedKey, initialValue, key]);

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
