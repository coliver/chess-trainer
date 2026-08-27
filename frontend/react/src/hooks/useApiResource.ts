// frontend/src/hooks/useApiResource.ts
import { useEffect, useState } from "react";
import api from "../api";

// Fetches `url` once on mount and returns `fallback` until it resolves.
// Collapses the common `useState(fallback) + useEffect(() => api.get(...))`
// pair used for independent, fire-and-forget GETs (e.g. dashboard widgets)
// into one call.
export function useApiResource<T>(url: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    let cancelled = false;

    api
      .get(url)
      .then((res) => {
        if (!cancelled) setValue(res.data ?? fallback);
      })
      .catch((e) => console.error(`Error loading ${url}:`, e));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is only read on resolve, not a reactive input
  }, [url]);

  return value;
}
