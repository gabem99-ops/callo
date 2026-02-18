/**
 * Format seconds into human-readable duration
 * 125 → "2m 5s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return "0s";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format seconds into MM:SS or HH:MM:SS
 * 125 → "02:05"
 */
export function formatDurationClock(seconds: number): string {
  if (seconds < 0) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * Format minutes into a compact display
 * 1500 → "25h 0m"
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Convert cents to dollar display
 * 4850 → "$48.50"
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
