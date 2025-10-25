import { MONTH_LABELS as FULL_MONTH_LABELS, MONTH_LABELS_SHORT } from './constants.js';

/**
 * Utilidades compartidas entre Vanilla y React
 * Sin dependencias de DOM ni frameworks específicos
 */

/**
 * Formatear número con separador de miles
 */
export function formatNumber(num, options = {}) {
  if (num == null || !Number.isFinite(Number(num))) {
    return '—';
  }

  const { decimals, minimumFractionDigits, maximumFractionDigits } = options;
  const localeOptions = {};

  if (typeof decimals === 'number') {
    localeOptions.minimumFractionDigits = decimals;
    localeOptions.maximumFractionDigits = decimals;
  } else {
    if (typeof minimumFractionDigits === 'number') {
      localeOptions.minimumFractionDigits = minimumFractionDigits;
    }
    if (typeof maximumFractionDigits === 'number') {
      localeOptions.maximumFractionDigits = maximumFractionDigits;
    }
  }

  return Number(num).toLocaleString('es-MX', localeOptions);
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
export const MONTH_LABELS = FULL_MONTH_LABELS;

/**
 * Obtener mes corto
 */
export function getShortMonth(monthIndex) {
  return MONTH_LABELS_SHORT[monthIndex] || '';
}
