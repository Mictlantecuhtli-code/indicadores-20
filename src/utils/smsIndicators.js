function normalizeText(value, { lowercase = false } = {}) {
  let text = (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (lowercase) {
    text = text.toLowerCase();
  } else {
    text = text.toUpperCase();
  }

  return text;
}

export function normalizeIndicatorText(value) {
  return normalizeText(value, { lowercase: true });
}

export function normalizeScenarioKey(value) {
  const text = normalizeText(value);
  if (!text) return '';

  return text
    .replace(/\b(META|OBJETIVO|ESCENARIO|ANUAL)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FAUNA_IMPACT_CODES = new Set(['SMS-01']);

export function isFaunaImpactRateIndicator(indicator) {
  if (!indicator) return false;

  const code = indicator?.clave?.toString().trim().toUpperCase();
  if (code && FAUNA_IMPACT_CODES.has(code)) {
    return true;
  }

  const textFields = [
    indicator?.nombre,
    indicator?.descripcion,
    indicator?.indicador_nombre,
    indicator?.nombre_indicador,
    indicator?.titulo,
    indicator?.display_name,
    indicator?.meta_titulo
  ]
    .map(normalizeIndicatorText)
    .filter(Boolean);

  return textFields.some(text => text.includes('fauna') && (text.includes('impact') || text.includes('tasa')));
}
