/**
 * Helpers para procesamiento de datos de gráficos SMS
 */

import { MONTH_LABELS } from '../shared';

/**
 * Calcular promedio ignorando nulls
 */
export function calculateAverage(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const validValues = values.filter(v => v != null && Number.isFinite(Number(v)));
  if (!validValues.length) return null;
  const total = validValues.reduce((sum, val) => sum + Number(val), 0);
  return total / validValues.length;
}

/**
 * Calcular total ignorando nulls
 */
export function calculateTotal(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values
    .filter(v => v != null && Number.isFinite(Number(v)))
    .reduce((sum, val) => sum + Number(val), 0);
}

/**
 * Preparar datos mensuales para gráfico
 */
export function prepareMonthlyData(records, monthField = 'mes', valueFields = []) {
  return MONTH_LABELS.map((monthLabel, index) => {
    const month = index + 1;
    const record = records?.find(r => r?.[monthField] === month);

    const dataPoint = {
      month: monthLabel,
      monthNumber: month
    };

    valueFields.forEach(field => {
      dataPoint[field] = record?.[field] ?? null;
    });

    return dataPoint;
  });
}

/**
 * Obtener color según porcentaje vs meta
 */
export function getStatusColor(value, target, inverted = false) {
  if (value == null || target == null) return 'gray';

  const percentage = (Number(value) / Number(target)) * 100;

  if (Number.isNaN(percentage)) return 'gray';

  if (inverted) {
    if (percentage <= 50) return 'green';
    if (percentage <= 80) return 'yellow';
    return 'red';
  }

  if (percentage >= 100) return 'green';
  if (percentage >= 70) return 'yellow';
  return 'red';
}

/**
 * Obtener clase de Tailwind según status
 */
export function getStatusClass(value, target, inverted = false) {
  const color = getStatusColor(value, target, inverted);

  const colorMap = {
    green: 'text-green-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-slate-400'
  };

  return colorMap[color] || 'text-slate-600';
}
