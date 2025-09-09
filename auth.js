// ==============================
// ARCHIVO: auth.js
// Sistema de autenticación (cliente)
// ==============================

/* ====== Defaults seguros si faltan en config.js ====== */
window.SESSION_CONFIG = window.SESSION_CONFIG || {
  token_key: 'aifa_auth_token',
  user_key: 'aifa_user_data',
  expires_key: 'aifa_session_expires',
  session_hours: 2 // duración por defecto
};

window.ROLES = window.ROLES || {
  ADMIN: 'administrador',
  SUBDIRECTOR: 'subdirector',
  CAPTURISTA: 'capturista'
};

window.MENSAJES = window.MENSAJES || {
  ERROR_AUTENTICACION: 'Error de autenticación',
  ERROR_SESION_EXPIRADA: 'La sesión ha expirado',
  LOGOUT_EXITOSO: 'Sesión cerrada correctamente'
};

/* ====== Estado global ====== */
let _currentUser = window.currentUser || null;

/* ====== Utils de almacenamiento ====== */
function _readFromStorage(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function _writeToStorage(key, value, recordarme) {
  if (recordarme) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
}

function _removeFromBoth(key) {
  try { localStorage.removeItem(key); } catch (_) {}
  try { sessionStorage.removeItem(key); } catch (_) {}
}

/* ====== Guardado / limpieza de sesión ====== */
function guardarSesionLocal(token, userData, recordarme) {
  try {
    const tKey = SESSION_CONFIG.token_key;
    const uKey = SESSION_CONFIG.user_key;
    const eKey = SESSION_CONFIG.expires_key || 'aifa_session_expires';
    const durH = Number(SESSION_CONFIG.session_hours || 2);
    const expiresAt = Date.now() + durH * 60 * 60 * 1000;

    _writeToStorage(tKey, token, recordarme);
    _writeToStorage(uKey, JSON.stringify(userData), recordarme);
    _writeToStorage(eKey, String(expiresAt), recordarme);

    log('[AUTH] Sesión guardada', { recordarme, user: userData?.username, expira: new Date(expiresAt).toISOString() });
  } catch (e) {
    logError('[AUTH] Error guardando sesión local', e);
  }
}

function limpiarSesionLocal() {
  const { token_key, user_key, expires_key } = SESSION_CONFIG;
  _removeFromBoth(token_key);
  _removeFromBoth(user_key);
  if (expires_key) _removeFromBoth(expires_key);
}

/* ====== Normalización de permisos por rol ====== */
function asegurarPermisosPorRol(user) {
  const rol = user?.rol;
  const base = user?.permisos || {};
  let permisos = {};

  if (rol === ROLES.ADMIN) {
    permisos = { puede_capturar: true, puede_editar: true, puede_ver_historico: true, puede_administrar_usuarios: true };
  } else if (rol === ROLES.SUBDIRECTOR) {
    permisos = { puede_capturar: true, puede_editar: true, puede_ver_historico: true, puede_administrar_usuarios: false };
  } else if (rol === ROLES.CAPTURISTA) {
    permisos = { puede_capturar: true, puede_editar: false, puede_ver_historico: false, puede_administrar_usuarios: false };
  } else {
    permisos = { puede_capturar: false, puede_editar: false, puede_ver_historico: false, puede_administrar_usuarios: false };
  }

  // respeta banderas ya definidas si existen (no las pisa forzosamente)
  user.permisos = { ...permisos, ...base };
  return user;
}

/* ====== Verificación de sesión ====== */
async function verificarSesionExistente() {
  try {
    const tKey = SESSION_CONFIG.token_key;
    const uKey = SESSION_CONFIG.user_key;
    const eKey = SESSION_CONFIG.expires_key || 'aifa_session_expires';

    const token = _readFromStorage(tKey);
    const userStr = _readFromStorage(uKey);
    const expStr = _readFromStorage(eKey);

    if (!token || !userStr) {
      log('[AUTH] No hay sesión guardada localmente');
      return { valid: false };
    }

    // expiración simple lado cliente
    if (expStr && Date.now() > Number(expStr)) {
      log('[AUTH] Sesión expirada localmente');
      limpiarSesionLocal();
      mostrarNotificacion?.(MENSAJES.ERROR_SESION_EXPIRADA, 'warning');
      return { valid: false, expired: true };
    }

    // Parsear usuario
    let user;
    try { user = JSON.parse(userStr); } catch {
      limpiarSesionLocal();
      return { valid: false };
    }

    // (Opcional) Validación con Supabase si tienes tabla de sesiones:
    // const { data, error } = await sb.rpc('validar_token', { token }); // ejemplo
    // if (error || !data?.valido) { limpiarSesionLocal(); return { valid: false }; }

    // Normalizar permisos y marcar autenticado
    user = asegurarPermisosPorRol({ ...user, isAuthenticated: true });
    _currentUser = user;
    window.currentUser = user;

    log('[AUTH] Sesión restaurada', { username: user.username, rol: user.rol });
    return { valid: true, user };
  } catch (e) {
    logError('[AUTH] Error verificando sesión', e);
    return { valid: false, error: e };
  }
}

/* ====== Login (placeholder) ====== */
/* 
   Con Supabase real usarías: await sb.auth.signInWithPassword({ email, password })
   Aquí solo ilustramos el flujo y guardamos sesión.
*/
async function iniciarSesion({ usernameOrEmail, password, recordarme = false }) {
  try {
    // TODO: Reemplazar por flujo real
    // const { data, error } = await sb.auth.signInWithPassword({ email, password });

    // DEMO: mapeo simple por email/usuario (ajusta a tu backend)
    const demoUsers = {
      'admin@aifa.aero': { id: 1, username: 'admin', rol: ROLES.ADMIN, area: 'comercial' },
      'sub@aifa.aero':   { id: 3, username: 'sub', rol: ROLES.SUBDIRECTOR, area: 'general' },
      'captura@aifa.aero': { id: 2, username: 'capturista01', rol: ROLES.CAPTURISTA, area: 'comercial' }
    };

    const key = String(usernameOrEmail || '').toLowerCase();
    const base = demoUsers[key];
    if (!base) {
      mostrarNotificacion?.('Usuario o contraseña inválidos', 'error');
      return { ok: false };
    }

    const token = 'dev-token'; // reemplazar por access_token real
    const user = asegurarPermisosPorRol({
      id: base.id,
      username: base.username,
      email: key,
      rol: base.rol,
      area: base.area,
      isAuthenticated: true
    });

    guardarSesionLocal(token, user, recordarme);
    _currentUser = user;
    window.currentUser = user;

    log('[AUTH] Login exitoso', { user: user.username, rol: user.rol });
    return { ok: true, user };
  } catch (e) {
    logError('[AUTH] Error en login', e);
    mostrarNotificacion?.(MENSAJES.ERROR_AUTENTICACION, 'error');
    return { ok: false, error: e };
  }
}

/* ====== Logout ====== */
async function cerrarSesion() {
  try {
    // Si usas sb.auth, puedes hacer: await sb.auth.signOut();
    limpiarSesionLocal();
    _currentUser = null;
    window.currentUser = null;
    mostrarNotificacion?.(MENSAJES.LOGOUT_EXITOSO, 'success');
    window.location.href = 'login.html';
  } catch (e) {
    logError('[AUTH] Error cerrando sesión', e);
  }
}

/* ====== Permisos granulares ====== */
function verificarPermisos(permiso) {
  const p = _currentUser?.permisos || {};
  switch (permiso) {
    case 'capturar':       return p.puede_capturar === true;
    case 'editar':         return p.puede_editar === true;
    case 'ver_historico':  return p.puede_ver_historico === true;
    case 'admin_usuarios': return p.puede_administrar_usuarios === true;
    default: return false;
  }
}

/* ====== Validación de operaciones de escritura (cliente) ====== */
function validarOperacionEscritura(operacion, contexto = {}) {
  // Hardening básico del lado cliente
  const user = _currentUser;
  if (!user?.isAuthenticated) {
    mostrarNotificacion?.('Sesión no válida', 'error');
    return false;
  }

  // Regla año/mes vigente si aplica
  const ahora = new Date();
  const anoActual = (typeof ANO_ACTUAL !== 'undefined') ? ANO_ACTUAL : ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  if (operacion === 'upsert_medicion') {
    if (!verificarPermisos('capturar')) {
      mostrarNotificacion?.('No tiene permiso para capturar', 'error');
      return false;
    }
    if (contexto.anio !== anoActual || contexto.mes !== mesActual) {
      mostrarNotificacion?.('Solo se permite capturar el mes vigente del año actual', 'error');
      return false;
    }
    // Capturista: solo su área
    if (user.rol === ROLES.CAPTURISTA && user.area && contexto.area && contexto.area !== user.area) {
      mostrarNotificacion?.('No está autorizado para capturar en esta área', 'error');
      return false;
    }
  }

  return true;
}

/* ====== UI helpers opcionales ====== */
function mostrarInfoUsuario() {
  try {
    const u = _currentUser;
    const elementosUsername = document.querySelectorAll('[data-user="username"], [data-user="username-display"]');
    elementosUsername.forEach(el => { el.textContent = u?.username || 'Usuario'; });
    const elementosRol = document.querySelectorAll('[data-user="rol"], [data-user="rol-display"]');
    elementosRol.forEach(el => { el.textContent = u?.rol || 'usuario'; });
    const elementosArea = document.querySelectorAll('[data-user="area-display"]');
    elementosArea.forEach(el => {
      let areaTexto = '';
      if (u?.area) {
        if (typeof AREAS !== 'undefined' && AREAS[u.area]) areaTexto = ' - ' + AREAS[u.area];
        else areaTexto = ' - ' + u.area;
      }
      el.textContent = areaTexto;
    });
    log('[AUTH] Info de usuario mostrada');
  } catch (e) {
    // no-op
  }
}

/* ====== Guard de páginas ====== */
async function verificarAutenticacionRequerida() {
  const pagina = window.location.pathname.split('/').pop();

  // Páginas públicas (no requieren sesión)
  const paginasPublicas = ['login.html', 'index.html', '', 'construccion.html'];

  if (paginasPublicas.includes(pagina)) {
    log('[AUTH] Página pública, no se verifica sesión:', pagina);
    return;
  }

  // Si ya hay usuario en memoria pero falta persistencia, lo persistimos en caliente (dev-friendly)
  if (window.currentUser?.isAuthenticated === true && !_readFromStorage(SESSION_CONFIG.user_key)) {
    guardarSesionLocal('dev-token', window.currentUser, false);
  }

  const ses = await verificarSesionExistente();
  if (!ses.valid) {
    log('[AUTH] Página protegida sin sesión válida. Redirigiendo a login.');
    window.location.href = 'login.html';
  }
}

/* ====== Exponer API ====== */
window.authSystem = {
  // estado
  getCurrentUser: () => _currentUser,

  // sesión
  verificarSesionExistente,
  guardarSesionLocal,
  cerrarSesion,
  iniciarSesion,

  // permisos
  verificarPermisos,
  validarOperacionEscritura,

  // ui helpers
  mostrarInfoUsuario,

  // guard
  verificarAutenticacionRequerida
};

/* ====== Auto-inicialización ligera ====== */
(function bootAuth() {
  log('[AVIACIÓN] Inicializando sistema de autenticación completo');
  // No forzamos verificación aquí; deja que cada página llame a verificarAutenticacionRequerida o
  // que index_v2.html haga bootApp() y llame verificarSesionExistente().
  log('[AVIACIÓN] Sistema de autenticación inicializado correctamente');
})();
