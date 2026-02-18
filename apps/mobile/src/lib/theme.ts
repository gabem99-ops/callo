// ---------------------------------------------------------------------------
// Callo dark theme constants
// ---------------------------------------------------------------------------

export const colors = {
  background: "#09090B",
  surface: "#131318",
  surfaceHover: "#1A1A22",
  border: "#27272A",
  borderLight: "#3F3F46",
  primary: "#6366F1",
  primaryLight: "#818CF8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#F43F5E",
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;
