/**
 * Dashboard-specific constants for BookDashboard.jsx
 * Extracted for reusability and maintainability
 */

export const COLORS = {
  navy:   '#132F45',
  teal:   '#32667F',
  amber:  '#EEA23A',
  gold:   '#F3B940',
  orange: '#EA8B33',
  green:  '#22c55e',
  mint:   '#2dd4bf',
  indigo: '#6366f1',
  purple: '#a855f7',
  rose:   '#f43f5e',
};

export const GENRE_COLORS = {
  'Computer Science': { bg: 'rgba(99,102,241,.12)',  color: '#6366f1' },
  Mathematics:        { bg: 'rgba(34,197,94,.12)',   color: '#16a34a' },
  Business:           { bg: 'rgba(238,162,58,.15)',  color: '#b87a1a' },
  Science:            { bg: 'rgba(50,102,127,.12)',  color: '#32667F' },
  Literature:         { bg: 'rgba(168,85,247,.12)',  color: '#a855f7' },
  History:            { bg: 'rgba(244,63,94,.12)',   color: '#f43f5e' },
  Philosophy:         { bg: 'rgba(45,212,191,.12)',  color: '#0d9488' },
};

export const DURATION_COLORS = [
  COLORS.indigo,
  COLORS.teal,
  COLORS.mint,
  COLORS.amber,
  COLORS.rose,
  COLORS.purple,
];

export const BORROW_TABS = [
  { label: 'Daily',   value: 'daily' },
  { label: 'Weekly',  value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const KPI_ICONS = {
  totalBooks: { icon: 'BookOpen', bg: 'rgba(99,102,241,.12)', color: COLORS.indigo },
  availableCopies: { icon: 'BookMarked', bg: 'rgba(34,197,94,.12)', color: COLORS.green },
  // ... etc for others
};

