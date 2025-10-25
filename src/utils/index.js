/**
 * Índice centralizado de utilidades
 */

// Re-exportar desde shared
export {
  formatNumber,
  formatPercent,
  getMetricColor,
  normalizeText,
  calculateAverage,
  MONTH_LABELS,
  getShortMonth
} from './shared.js';

// Re-exportar desde constants
export {
  CURRENT_YEAR,
  MONTHS,
  MONTH_LABELS as MONTH_LABELS_FULL,
  MONTH_LABELS_SHORT,
  QUARTERS,
  SCENARIOS,
  DEFAULT_META,
  COLORS,
  CHART_CONFIG
} from './constants.js';

// Re-exportar desde chartHelpers
export {
  calculateTotal,
  prepareMonthlyData,
  getStatusColor,
  getStatusClass
} from './sms/chartHelpers.js';
