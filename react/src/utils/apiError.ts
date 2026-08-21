import axios from "axios";

export function apiErrorMessage(
  err: unknown,
  fallback: string,
  genericFallback: string,
): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.detail || fallback;
  }
  return genericFallback;
}
