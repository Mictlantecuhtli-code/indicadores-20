/**
 * Constantes globales del sistema
 */

// Año actual
export const CURRENT_YEAR = new Date().getFullYear();

// Meses del año
export const MONTHS = [
  { value: 1, label: 'Enero', short: 'Ene' },
  { value: 2, label: 'Febrero', short: 'Feb' },
  { value: 3, label: 'Marzo', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Mayo', short: 'May' },
  { value: 6, label: 'Junio', short: 'Jun' },
  { value: 7, label: 'Julio', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Septiembre', short: 'Sep' },
  { value: 10, label: 'Octubre', short: 'Oct' },
  { value: 11, label: 'Noviembre', short: 'Nov' },
  { value: 12, label: 'Diciembre', short: 'Dic' }
];

// Labels de meses (solo nombres)
export const MONTH_LABELS = MONTHS.map(month => month.label);

// Meses cortos
export const MONTH_LABELS_SHORT = MONTHS.map(month => month.short);

// Trimestres
export const QUARTERS = [
  { value: 1, label: 'Q1', months: [1, 2, 3] },
  { value: 2, label: 'Q2', months: [4, 5, 6] },
  { value: 3, label: 'Q3', months: [7, 8, 9] },
  { value: 4, label: 'Q4', months: [10, 11, 12] }
];

// Escenarios
export const SCENARIOS = {
  CONSERVADOR: 'CONSERVADOR',
  MODERADO: 'MODERADO',
  OPTIMISTA: 'OPTIMISTA'
};

// Meta por defecto para indicadores
export const DEFAULT_META = 100;

// Colores del tema
export const COLORS = {
  primary: '#1e3a8a',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  gray: '#64748b'
};

// Configuración de gráficos
export const CHART_CONFIG = {
  defaultHeight: 400,
  animationDuration: 750,
  tooltipFormat: 'DD/MM/YYYY',
  gridStrokeDasharray: '3 3'
};
