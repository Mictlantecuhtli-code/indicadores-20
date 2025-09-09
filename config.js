// =========================
// config.js (seguro / no invasivo)
// =========================

// === Sesión
window.SESSION_CONFIG = window.SESSION_CONFIG || {
  token_key: 'aifa_auth_token',
  user_key:  'aifa_user_data',
  // Si deseas expiración, agrega campos y lógica en utils/auth
  // expires_hours: 2,
  // remember_me_days: 7
};

// === Catálogos base (no pisar si ya existen)
window.ROLES = window.ROLES || {
  ADMIN: "administrador",
  SUBDIRECTOR: "subdirector",
  CAPTURISTA: "capturista"
};

window.AREAS = window.AREAS || {
  comercial:   "Aviación Comercial",
  general:     "Aviación General",
  carga:       "Aviación de Carga",
  operaciones: "Operaciones Aeroportuarias" // área padre (para menús/visuales)
};

window.INDICADORES = window.INDICADORES || {
  operaciones: "Operaciones",
  pasajeros:   "Pasajeros",
  toneladas:   "Toneladas"
};

window.MESES = (Array.isArray(window.MESES) && window.MESES.length === 12)
  ? window.MESES
  : ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

window.ANO_ACTUAL = (typeof window.ANO_ACTUAL === 'number' && window.ANO_ACTUAL) || (new Date().getFullYear());

window.VALIDACIONES = window.VALIDACIONES || {
  VALOR_MINIMO: 0,
  VALOR_MAXIMO: 1_000_000_000,
  DECIMALES_PERMITIDOS: 2
};

window.MENSAJES = window.MENSAJES || {
  ERROR_CARGA_DATOS: "No se pudieron cargar los datos",
  ERROR_GUARDAR: "Error al guardar",
  EXITO_GUARDAR: "Guardado correctamente"
};

// === Fallback local de usuarios (solo si backend no responde)
//    Puedes editar/retirar en producción.
window.USUARIOS = window.USUARIOS || [
  { id: 1, username: 'admin01',      password: '1234', email: 'admin@aifa.aero',      rol: 'administrador', area: 'operaciones', permisos: null },
  { id: 2, username: 'subdirector01',password: '1234', email: 'subdirector@aifa.aero',rol: 'subdirector',   area: 'operaciones', permisos: null },
  { id: 3, username: 'capturista01', password: '1234', email: 'captura@aifa.aero',    rol: 'capturista',    area: 'operaciones', permisos: null }
];

// === Supabase (si la usas, inicialízala aquí)
if (!window.sb && window.supabase && typeof window.supabase.createClient === 'function') {
  // Rellena con tus credenciales si usas Supabase auth y tablas:
  // const SUPABASE_URL = 'https://XXXX.supabase.co';
  // const SUPABASE_ANON_KEY = 'ey...';
  // window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
