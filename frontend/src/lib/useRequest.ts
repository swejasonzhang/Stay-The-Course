import { useCallback, useRef, useState } from "react";
import { ApiError } from "../api/client";

// Tracks one API call: its latest result, error, and whether it's loading.
// If the user submits again before the first answer arrives, only the newest answer is kept.
export function useRequest<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  const run = useCallback(async (call: () => Promise<T>) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await call();
      if (id === latest.current) {
        setData(result);
      }
    } catch (caught) {
      if (id === latest.current) {
        setError(caught);
      }
    } finally {
      if (id === latest.current) {
        setLoading(false);
      }
    }
  }, []);

  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  return { data, error, loading, run, fieldErrors };
}
