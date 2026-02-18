/**
 * Formatting utilities for the Callo mobile app.
 */

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "45s", "2m 30s", "1h 5m"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "0s";

  const totalSeconds = Math.round(seconds);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (secs > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${minutes}m`;
}

/**
 * Format a date to a relative time string.
 * Examples: "Just now", "2m ago", "1h ago", "Yesterday", "Feb 12"
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return `${months[past.getMonth()]} ${past.getDate()}`;
}

/**
 * Format a phone number to (XXX) XXX-XXXX format.
 * Handles numbers with or without country code prefix.
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle US numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7, 11);
    return `(${area}) ${prefix}-${line}`;
  }

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);
    return `(${area}) ${prefix}-${line}`;
  }

  // For non-standard lengths, return the original with basic formatting
  return phone;
}

/**
 * Format a decimal value as a percentage string.
 * Input is expected as a ratio (0-1) or percentage (0-100).
 * If the value is <= 1, it is treated as a ratio and multiplied by 100.
 */
export function formatPercentage(value: number): string {
  const pct = value > 1 ? Math.round(value) : Math.round(value * 100);
  return `${pct}%`;
}

/**
 * Format a timestamp (seconds from call start) to mm:ss.
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
