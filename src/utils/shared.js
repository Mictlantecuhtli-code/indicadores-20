/**
 * Utilidades compartidas entre Vanilla y React
 * Sin dependencias de DOM ni frameworks específicos
 */

/**
 * Formatear número con separador de miles
 */
export function formatNumber(num) {
  if (num == null || !Number.isFinite(Number(num))) {
    return '—';
  }
  return Number(num).toLocaleString('es-MX');
}

/**
 * Formatear porcentaje
 */
export function formatPercent(num, decimals = 1) {
  if (num == null || !Number.isFinite(Number(num))) {
    return '—';
  }
  return `${Number(num).toFixed(decimals)}%`;
}

/**
 * Obtener color según cumplimiento de meta
 */
export function getMetricColor(value, target, inverted = false) {
  if (value == null || target == null) return 'gray';
  
  const percentage = (value / target) * 100;
  
  if (inverted) {
    if (percentage <= 50) return 'green';
    if (percentage <= 80) return 'yellow';
    return 'red';
  } else {
    if (percentage >= 100) return 'green';
    if (percentage >= 70) return 'yellow';
    return 'red';
  }
}

/**
 * Normalizar texto para búsqueda
 */
export function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calcular promedio de un array
 */
export function calculateAverage(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const validValues = values.filter(v => Number.isFinite(v));
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

/**
 * Obtener meses del año en español
 */
export const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtener mes corto
 */
export function getShortMonth(monthIndex) {
  const shorts = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return shorts[monthIndex] || '';
}
