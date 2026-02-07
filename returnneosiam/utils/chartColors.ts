/**
 * Chart Color Palette
 * Based on UI/UX Pro Max Skill - Chart Guidelines
 * Accessible color combinations for data visualization
 */

export const CHART_COLORS = {
  // Status Colors (from Design System)
  Restock: '#22c55e',     // Green-500 - Positive/Completed
  RTV: '#f59e0b',         // Amber-500 - Return to Vendor
  Recycle: '#ef4444',     // Red-500 - Dispose/Recycle
  Claim: '#3b82f6',       // Blue-500 - Claims
  InternalUse: '#a855f7', // Purple-500 - Internal Use
  Pending: '#94a3b8',     // Slate-400 - Pending/Waiting
} as const;

// Extended palette for multi-series charts
export const CHART_PALETTE = [
  '#4f46e5', // Indigo-600 (Primary)
  '#22c55e', // Green-500
  '#f59e0b', // Amber-500
  '#ef4444', // Red-500
  '#3b82f6', // Blue-500
  '#a855f7', // Purple-500
  '#06b6d4', // Cyan-500
  '#ec4899', // Pink-500
  '#84cc16', // Lime-500
  '#f97316', // Orange-500
] as const;

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  primary: {
    start: 'rgba(79, 70, 229, 0.3)',
    end: 'rgba(79, 70, 229, 0.05)',
  },
  success: {
    start: 'rgba(34, 197, 94, 0.3)',
    end: 'rgba(34, 197, 94, 0.05)',
  },
  warning: {
    start: 'rgba(245, 158, 11, 0.3)',
    end: 'rgba(245, 158, 11, 0.05)',
  },
  danger: {
    start: 'rgba(239, 68, 68, 0.3)',
    end: 'rgba(239, 68, 68, 0.05)',
  },
} as const;

// Tooltip styles for Recharts
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: '#0f172a',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: '#475569',
    fontSize: '13px',
  },
} as const;

// Legend styles for Recharts
export const LEGEND_STYLE = {
  wrapperStyle: {
    paddingTop: '16px',
  },
  iconSize: 10,
  iconType: 'circle' as const,
} as const;

/**
 * Get color for status value
 */
export function getStatusColor(status: keyof typeof CHART_COLORS): string {
  return CHART_COLORS[status] || CHART_COLORS.Pending;
}

/**
 * Get color from palette by index (cycles if exceeds)
 */
export function getPaletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
