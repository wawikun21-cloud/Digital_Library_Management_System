/**
 * Theme Constants
 * Centralized theme values for consistent styling
 */

// Primary Brand Colors
export const COLORS = {
  // Primary Brand
  ACCENT_AMBER: "#EEA23A",
  ACCENT_ORANGE: "#EA8B33",
  
  // Status Colors
  SUCCESS: "#2d7a47",
  SUCCESS_BG: "rgba(50,127,79,0.1)",
  ERROR: "#dc2626",
  ERROR_BG: "rgba(220,38,38,0.18)",
  WARNING: "#b87a1a",
  WARNING_BG: "rgba(234,139,51,0.08)",
  INFO: "#32667F",
  INFO_BG: "rgba(50,102,127,0.12)",
  
  // Neutral
  WHITE: "#ffffff",
  BLACK: "#000000",
  
  // Text Colors (Light Mode)
  TEXT_PRIMARY_LIGHT: "#1a1a1a",
  TEXT_SECONDARY_LIGHT: "#666666",
  TEXT_MUTED_LIGHT: "#999999",
  
  // Text Colors (Dark Mode)
  TEXT_PRIMARY_DARK: "#f5f5f5",
  TEXT_SECONDARY_DARK: "#a0a0a0",
  TEXT_MUTED_DARK: "#6b7280",
  
  // Border Colors
  BORDER_LIGHT: "#e5e5e5",
  BORDER_DARK: "#374151",
};

// Status Color Mapping
export const STATUS_COLORS = {
  Available: {
    bg: "rgba(50,102,127,0.12)",
    color: "#32667F",
    border: "#32667F",
  },
  OutOfStock: {
    bg: "rgba(220,38,38,0.18)",
    color: "#dc2626",
    border: "#dc2626",
  },
  Borrowed: {
    bg: "rgba(238,162,58,0.12)",
    color: "#EEA23A",
    border: "#EEA23A",
  },
  Returned: {
    bg: "rgba(50,127,79,0.12)",
    color: "#2d7a47",
    border: "#2d7a47",
  },
  Overdue: {
    bg: "rgba(220,38,38,0.18)",
    color: "#dc2626",
    border: "#dc2626",
  },
};

// Book Cover Gradients
export const COVER_GRADIENTS = [
  ["#132F45", "#32667F"],
  ["#EEA23A", "#EA8B33"],
  ["#32667F", "#1a4a63"],
  ["#EA8B33", "#F3B940"],
  ["#1d3f57", "#32667F"],
  ["#b87a1a", "#EEA23A"],
  ["#1e3a5f", "#2d5a87"],
  ["#5c4033", "#8b6914"],
  ["#2d3436", "#636e72"],
  ["#4a148c", "#7b1fa2"],
];

// CSS Variable Mappings
export const CSS_VARS = {
  LIGHT: {
    "--bg-surface": "#ffffff",
    "--bg-subtle": "#f9fafb",
    "--bg-input": "#f3f4f6",
    "--bg-hover": "#f3f4f6",
    "--bg-sidebar": "#f8fafc",
    "--border": "#e5e7eb",
    "--border-light": "#f3f4f6",
    "--border-sidebar": "#e2e8f0",
    "--text-primary": "#1a1a1a",
    "--text-secondary": "#475569",
    "--text-muted": "#64748b",
    "--text-on-sidebar": "#475569",
    "--accent-amber": "#EEA23A",
    "--accent-orange": "#EA8B33",
    "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    "--shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  DARK: {
    "--bg-surface": "#1e293b",
    "--bg-subtle": "#0f172a",
    "--bg-input": "#334155",
    "--bg-hover": "#334155",
    "--bg-sidebar": "#0f172a",
    "--border": "#334155",
    "--border-light": "#1e293b",
    "--border-sidebar": "#1e293b",
    "--text-primary": "#f1f5f9",
    "--text-secondary": "#94a3b8",
    "--text-muted": "#64748b",
    "--text-on-sidebar": "#e2e8f0",
    "--accent-amber": "#EEA23A",
    "--accent-orange": "#EA8B33",
    "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
    "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
    "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
    "--shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
  },
};

// Animation Durations
export const ANIMATION = {
  FAST: "100ms",
  NORMAL: "150ms",
  SLOW: "300ms",
  MODAL: "200ms",
};

// Z-Index Scale
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  POPOVER: 60,
  TOOLTIP: 70,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
};

// Spacing Scale
export const SPACING = {
  XS: "0.25rem",
  SM: "0.5rem",
  MD: "1rem",
  LG: "1.5rem",
  XL: "2rem",
  "2XL": "3rem",
};

// Font Sizes
export const FONT_SIZES = {
  XS: "0.75rem",
  SM: "0.875rem",
  BASE: "1rem",
  LG: "1.125rem",
  XL: "1.25rem",
  "2XL": "1.5rem",
  "3XL": "1.875rem",
  "4XL": "2.25rem",
};

// Border Radius
export const BORDER_RADIUS = {
  NONE: "0",
  SM: "0.25rem",
  DEFAULT: "0.5rem",
  MD: "0.75rem",
  LG: "1rem",
  XL: "1.5rem",
  FULL: "9999px",
};

// Default export
export default {
  COLORS,
  STATUS_COLORS,
  COVER_GRADIENTS,
  CSS_VARS,
  ANIMATION,
  Z_INDEX,
  BREAKPOINTS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
};

