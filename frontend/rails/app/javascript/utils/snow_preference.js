const STORAGE_KEY = "snow_enabled"

// Purely local (localStorage) toggle for the snow easter egg, matching
// react/src/hooks/useSnowPreference.ts. Deliberately not part of the
// server-synced preferences, so it needs no user_preferences column.
export function readSnowEnabled() {
  return localStorage.getItem(STORAGE_KEY) === "true"
}

export function setSnowEnabled(value) {
  localStorage.setItem(STORAGE_KEY, String(value))
}
