/**
 * Form Persistence Hook
 * Saves and restores form data to localStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormPersistenceOptions<T> {
  key: string;
  initialData: T;
  debounceMs?: number;
  excludeFields?: (keyof T)[];
}

interface UseFormPersistenceReturn<T> {
  data: T;
  setData: (data: T | ((prev: T) => T)) => void;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  clearPersistedData: () => void;
  hasPersistedData: boolean;
  isRestoring: boolean;
}

/**
 * Hook to persist form data to localStorage with auto-save
 */
export function useFormPersistence<T extends Record<string, unknown>>({
  key,
  initialData,
  debounceMs = 500,
  excludeFields = [],
}: UseFormPersistenceOptions<T>): UseFormPersistenceReturn<T> {
  const [data, setDataState] = useState<T>(initialData);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Storage key with prefix
  const storageKey = `form_draft_${key}`;

  // Restore data from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restoredData = { ...initialData };

        // Restore only non-excluded fields
        Object.keys(parsed).forEach((field) => {
          if (!excludeFields.includes(field as keyof T)) {
            (restoredData as Record<string, unknown>)[field] = parsed[field];
          }
        });

        setDataState(restoredData);
        setHasPersistedData(true);
      }
    } catch (error) {
      console.error('[FormPersistence] Failed to restore data:', error);
    } finally {
      setIsRestoring(false);
    }
  }, [storageKey, initialData, excludeFields]);

  // Debounced save to localStorage
  const persistData = useCallback(
    (newData: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          // Filter out excluded fields before saving
          const dataToSave: Partial<T> = {};
          Object.keys(newData).forEach((field) => {
            if (!excludeFields.includes(field as keyof T)) {
              dataToSave[field as keyof T] = newData[field as keyof T];
            }
          });

          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          setHasPersistedData(true);
        } catch (error) {
          console.error('[FormPersistence] Failed to save data:', error);
        }
      }, debounceMs);
    },
    [storageKey, debounceMs, excludeFields]
  );

  // Set data and persist
  const setData = useCallback(
    (newDataOrUpdater: T | ((prev: T) => T)) => {
      setDataState((prev) => {
        const newData =
          typeof newDataOrUpdater === 'function'
            ? (newDataOrUpdater as (prev: T) => T)(prev)
            : newDataOrUpdater;

        persistData(newData);
        return newData;
      });
    },
    [persistData]
  );

  // Update a single field
  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    [setData]
  );

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      localStorage.removeItem(storageKey);
      setHasPersistedData(false);
    } catch (error) {
      console.error('[FormPersistence] Failed to clear data:', error);
    }
  }, [storageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    setData,
    updateField,
    clearPersistedData,
    hasPersistedData,
    isRestoring,
  };
}

/**
 * Check if there's a draft saved for a form
 */
export function hasSavedDraft(key: string): boolean {
  try {
    const stored = localStorage.getItem(`form_draft_${key}`);
    return stored !== null;
  } catch {
    return false;
  }
}

/**
 * Clear a saved draft
 */
export function clearSavedDraft(key: string): void {
  try {
    localStorage.removeItem(`form_draft_${key}`);
  } catch {
    // Ignore errors
  }
}

export default useFormPersistence;
