/* =========================================================================
 * auth.js — Sistema de autenticación unificado
 * - Usa SESSION_CONFIG si existe; si no, defaults.
 * - Lee/escribe sesión en localStorage o sessionStorage (según "Recordarme").
 * - Expone window.authSystem con: login, logout, getUser, isAuthenticated,
 *   validarOperacionEscritura, restaurar.
 * ========================================================================= */

(function () {
  // -------------------------------
  // Config tolerante
  // -------------------------------
  const TOKEN_KEY = (window.SESSION_CONFIG && SESSION_CONFIG.token_key) || 'aifa_auth_token';
  const USER_KEY  = (window.SESSION_CONFIG && SESSION_CONFIG.user_key ) || 'aifa_user_data';
  const REDIRECT_KEY = 'aifa_redirect_after_login';

  const ROLES = (window.ROLES) || {
    ADMIN: 'administrador',
    SUBDIRECTOR: 'subdirector',
    CAPTURISTA: 'capturista'
  };

  const ANO_ACTUAL = (typeof window.ANO_ACTUAL === 'number' && window.ANO_ACTUAL) || (new Date().getFullYear());

  // -------------------------------
  // Logs
  // -------------------------------
  function log(...a){ try{ console.log('[AVIACIÓN]', ...a);}catch{} }
  function warn(...a){ try{ console.warn('[AVIACIÓN]', ...a);}catch{} }
  function err(...a){ try{ console.error('[AVIACIÓN]', ...a);}catch{} }

  // -------------------------------
  // Helpers de sesión (reusan utils si existen)
  // -------------------------------
  function _readSessionLocal() {
    const token  = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    const userStr= localStorage.getItem(USER_KEY)  || sessionStorage.getItem(USER_KEY)  || null;
    return { token, userStr };
  }
  const readSession = (typeof window.readSession === 'function') ? window.readSession : _readSessionLocal;

  function setSession(token, userObj, remember) {
    try {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token || '');
      storage.setItem(USER_KEY, JSON.stringify(userObj || {}));
      // Limpia el otro storage para evitar estados mezclados
      const other = remember ? sessionStorage : localStorage;
      other.removeItem(TOKEN_KEY);
      other.removeItem(USER_KEY);
      log('Sesión guardada en', remember ? 'localStorage' : 'sessionStorage', 'para', userObj?.username);
    } catch (e) {
      err('Error guardando sesión:', e);
    }
  }

  function clearSessionEverywhere() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(REDIRECT_KEY);
      log('Sesión limpiada de LS/SS');
    } catch (e) {
      err('Error limpiando sesión:', e);
    }
  }

  function parseUser(userStr) {
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  }

  function getStoredUser() {
    const { userStr } = readSession();
    return parseUser(userStr);
  }

  function isAuthenticated() {
    const { token, userStr } = readSession();
    return !!(token && userStr);
  }

  // -------------------------------
  // Normalización de permisos por rol (fallback si backend no los da)
  // -------------------------------
  function permisosPorRol(rol) {
    const r = (rol || '').toLowerCase();
    if (r === ROLES.ADMIN || r === ROLES.SUBDIRECTOR) {
      return {
        puede_capturar: true,
        puede_editar: true,
        puede_ver_historico: true,
        puede_administrar_usuarios: (r === ROLES.ADMIN),
        anos_permitidos: [ANO_ACTUAL], // amplía si quieres histórico
        areas_permitidas: Object.keys(window.AREAS || { operaciones:1, comercial:1, general:1, carga:1 })
      };
    }
    // Capturista por defecto
    return {
      puede_capturar: true,
      puede_editar: false,
      puede_ver_historico: false,
      puede_administrar_usuarios: false,
      anos_permitidos: [ANO_ACTUAL],
      areas_permitidas: Object.keys(window.AREAS || { operaciones:1, comercial:1, general:1, carga:1 })
    };
  }

  function normalizeUser(u) {
    if (!u) return null;
    const permisos = u.permisos || permisosPorRol(u.rol);
    return {
      id: u.id || 0,
      username: u.username || u.correo || 'usuario',
      email: u.email || u.correo || '',
      rol: (u.rol || 'capturista').toLowerCase(),
      area: u.area || 'operaciones',
      permisos,
      isAuthenticated: true
    };
  }

  // -------------------------------
  // Login: intenta Supabase (si existe `sb`), si no → modo local con USUARIOS
  // -------------------------------
  async function login(username, password, remember) {
    const userTrim = (username || '').trim();
    const passTrim = (password || '').trim();
    if (!userTrim || !passTrim) throw new Error('Capture usuario y contraseña.');

    // 1) Intentar Supabase (tabla 'usuarios' o RPC) si existe 'sb'
    if (window.sb && typeof sb.from === 'function') {
      log('[AUTH] Autenticando contra Supabase...');
      // Ajusta a tu esquema real:
      // A) Ejemplo con tabla "usuarios" (hash en backend; aquí se simula "password" directo)
      const { data, error } = await sb
        .from('usuarios')
        .select('id, username, email, rol, area, permisos')
        .eq('username', userTrim)
        .eq('password', passTrim) // ⚠️ en producción NO guardes password plano, usa auth de Supabase o hash server-side
        .maybeSingle();

      if (error) {
        err('[AUTH] Supabase error:', error);
        throw new Error('No fue posible autenticar en este momento.');
      }
      if (!data) {
        throw new Error('Usuario o contraseña incorrectos.');
      }

      const userObj = normalizeUser(data);
      const token = genToken();
      setSession(token, userObj, !!remember);
      // refrescar currentUser global
      window.currentUser = Object.assign({}, window.currentUser || {}, userObj);
      return userObj;
    }

    // 2) Fallback: modo local con `USUARIOS` en config.js
    log('[AUTH] Backend no disponible → modo local (USUARIOS)');
    if (!Array.isArray(window.USUARIOS)) {
      throw new Error('No hay backend de autenticación ni catálogo local (USUARIOS).');
    }
    const found = USUARIOS.find(u => u.username === userTrim && u.password === passTrim);
    if (!found) throw new Error('Credenciales incorrectas (modo local).');

    const userObj = normalizeUser(found);
    const token = genToken();
    setSession(token, userObj, !!remember);
    window.currentUser = Object.assign({}, window.currentUser || {}, userObj);
    return userObj;
  }

  function genToken() {
    const rnd = Math.random().toString(36).slice(2);
    const stamp = Date.now().toString(36);
    return `aifa_${Date.now()}_${rnd}_${(navigator.userAgent||'ua').slice(0,12)}`;
  }

  // -------------------------------
  // Logout
  // -------------------------------
  function logout() {
    log('[AUTH] Logout solicitado');
    clearSessionEverywhere();
    try { window.currentUser = null; } catch(_) {}
    window.location.href = 'login.html';
  }

  // -------------------------------
  // Validación de operación de escritura
  // - Capturista: solo mes vigente del año actual
  // - Admin/Subdirector: sin esa restricción (puedes agregar reglas finas por "operacion")
  // ctx esperado: { area, anio, mes }
  // -------------------------------
  function validarOperacionEscritura(operacion, ctx) {
    try {
      const u = getStoredUser();
      if (!u) { warn('[AUTH] validarOperacionEscritura: no hay usuario'); return false; }

      // Solo validamos la restricción temporal para capturista
      if (u.rol === ROLES.CAPTURISTA) {
        const hoy = new Date();
        const mesVigente = hoy.getMonth() + 1;
        const anioVigente = ANO_ACTUAL;

        if (!ctx || ctx.anio !== anioVigente || ctx.mes !== mesVigente) {
          const mesTxt = (window.MESES && window.MESES[mesVigente - 1]) ? window.MESES[mesVigente - 1] : mesVigente;
          alert(`Como capturista, solo puede capturarse el mes vigente (${mesTxt}) del año ${anioVigente}.`);
          return false;
        }
      }

      // Aquí podrías agregar más reglas por operación/rol/área si las necesitas.
      return true;
    } catch (e) {
      err('[AUTH] validarOperacionEscritura error:', e);
      return false;
    }
  }

  // -------------------------------
  // Restaurar sesión a window.currentUser (útil en páginas)
  // -------------------------------
  function restaurar() {
    const { token, userStr } = readSession();
    if (!token || !userStr) {
      warn('[AUTH] restaurar: no hay sesión en storage');
      return { valid: false, user: null };
    }
    const user = parseUser(userStr);
    if (!user) {
      warn('[AUTH] restaurar: user inválido en storage');
      return { valid: false, user: null };
    }
    window.currentUser = Object.assign({}, window.currentUser || {}, user, { isAuthenticated: true });
    log('[AUTH] Sesión restaurada:', { username: user.username, rol: user.rol });
    return { valid: true, user };
  }

  // -------------------------------
  // Exponer API pública
  // -------------------------------
  window.authSystem = {
    login,
    logout,
    getUser: getStoredUser,
    isAuthenticated,
    validarOperacionEscritura,
    restaurar
  };

  log('Módulo de autenticación auth.js cargado completamente');
})();
