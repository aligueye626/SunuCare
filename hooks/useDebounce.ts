import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a rapidly changing value (e.g. search query input)
 */
export function useDebounce<T>(value: T, delayMs = 280): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;

