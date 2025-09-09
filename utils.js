/* =========================================================================
 * utils.js — Utilidades de sesión, logs y helpers de UI
 * ========================================================================= */

(function () {
  const TOKEN_KEY = (window.SESSION_CONFIG && SESSION_CONFIG.token_key) || 'aifa_auth_token';
  const USER_KEY  = (window.SESSION_CONFIG && SESSION_CONFIG.user_key ) || 'aifa_user_data';
  const REDIRECT_KEY = 'aifa_redirect_after_login';

  function prefix() { return '[AVIACIÓN]'; }
  function log(...args)     { try { console.log(prefix(), ...args); } catch (_) {} }
  function logWarn(...args) { try { console.warn(prefix(), ...args); } catch (_) {} }
  function logError(...args){ try { console.error(prefix(), ...args); } catch (_) {} }

  function _readSessionLocal() {
    // Valida expiración si decides añadirla en el futuro:
    // const exp = Number(localStorage.getItem('aifa_session_expires') || sessionStorage.getItem('aifa_session_expires') || 0);
    // if (exp && Date.now() > exp) { clearSessionEverywhere(); return { token:null, userStr:null }; }
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
      // Limpia el otro para evitar estados mezclados
      const other = remember ? sessionStorage : localStorage;
      other.removeItem(TOKEN_KEY);
      other.removeItem(USER_KEY);
      log('Sesión guardada en', remember ? 'localStorage' : 'sessionStorage', 'para', userObj?.username);
    } catch (e) { logError('Error guardando sesión:', e); }
  }

  function clearSessionEverywhere() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(REDIRECT_KEY);
      log('Sesión limpiada de LS/SS');
    } catch (e) { logError('Error limpiando sesión:', e); }
  }

  function parseUser(userStr) { if (!userStr) return null; try { return JSON.parse(userStr); } catch { return null; } }

  function verificarSesionExistente() {
    log('Verificando sesión existente');
    const { token, userStr } = readSession();
    if (!token || !userStr) { log('No hay sesión guardada localmente'); return { valid: false, token: null, user: null }; }
    const user = parseUser(userStr);
    if (!user) { logWarn('userData inválido en storage'); return { valid: false, token, user: null }; }
    log('Sesión detectada para', user.username, '-', user.rol);
    return { valid: true, token, user };
  }

  function restaurarSesion() {
    const res = verificarSesionExistente();
    if (res.valid && res.user) {
      window.currentUser = Object.assign({}, window.currentUser || {}, res.user, { isAuthenticated: true });
      log('Sesión restaurada exitosamente:', { username: currentUser.username, rol: currentUser.rol });
    }
    return res;
  }

  function verificarAutenticacionRequerida(opts) {
    log('Verificando autenticación requerida:', opts || {});
    const res = verificarSesionExistente();
    if (!res.valid) {
      if (opts && opts.pagina) { try { localStorage.setItem(REDIRECT_KEY, opts.pagina); } catch(_) {} }
      window.location.href = 'login.html'; return false;
    }
    log('Autenticación verificada correctamente'); return true;
  }

  function mostrarPantallaCargar(mostrar) {
    const el = document.getElementById('loadingScreen'); if (!el) return;
    if (mostrar) el.classList.remove('hidden'); else el.classList.add('hidden');
  }

  window.log = log; window.logWarn = logWarn; window.logError = logError;
  window.readSession = readSession; window.setSession = setSession; window.clearSessionEverywhere = clearSessionEverywhere;
  window.verificarSesionExistente = verificarSesionExistente; window.restaurarSesion = restaurarSesion; window.verificarAutenticacionRequerida = verificarAutenticacionRequerida;
  window.mostrarPantallaCargar = mostrarPantallaCargar;
})();
