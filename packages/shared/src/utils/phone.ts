/**
 * Format a phone number from E.164 to display format
 * +12125551234 → (212) 555-1234
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const area = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const line = cleaned.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }

  if (cleaned.length === 10) {
    const area = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const line = cleaned.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }

  return phone;
}

/**
 * Normalize a phone number to E.164 format
 * (212) 555-1234 → +12125551234
 */
export function toE164(phone: string, countryCode = "1"): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith(countryCode) && cleaned.length === countryCode.length + 10) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+${countryCode}${cleaned}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  return `+${cleaned}`;
}

/**
 * Validate if a string looks like a valid phone number
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}
