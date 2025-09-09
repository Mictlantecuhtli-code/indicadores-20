/* =========================================================================
 * navigation.js  —  Guards de navegación + helpers de sesión (LS/SS)
 * - Usa SESSION_CONFIG si existe; si no, usa defaults.
 * - Lee SIEMPRE token/user de localStorage o sessionStorage (en ese orden).
 * - No declara 'currentUser' para evitar colisiones.
 * - Expone: readSession, isAuthenticated, getCurrentUser, navigateTo,
 *           showMenu, showCaptura, showVisualizacion, showVisualizacionDetalle,
 *           irAMenuAreas
 * ========================================================================= */

(function () {
  // -------------------------------
  // Config de llaves (segura)
  // -------------------------------
  const TOKEN_KEY = (window.SESSION_CONFIG && SESSION_CONFIG.token_key) || 'aifa_auth_token';
  const USER_KEY  = (window.SESSION_CONFIG && SESSION_CONFIG.user_key ) || 'aifa_user_data';
  const REDIRECT_KEY = 'aifa_redirect_after_login';

  // Páginas públicas (no requieren sesión)
  const PUBLIC_PAGES = ['login.html', 'recuperar.html', ''];

  // -------------------------------
  // Helpers de sesión
  // -------------------------------
  function readSession() {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || null;
    return { token, userStr };
  }

  function parseUser(userStr) {
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  }

  function getCurrentUser() {
    const { userStr } = readSession();
    return parseUser(userStr);
  }

  function isAuthenticated() {
    const { token, userStr } = readSession();
    return !!(token && userStr);
  }

  // Limpieza total de sesión (útil para logout)
  function clearSessionEverywhere() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(REDIRECT_KEY);
    } catch (_) {}
  }

  // -------------------------------
  // Guard de acceso por página
  // -------------------------------
  function normalizePageName(hrefOrName) {
    const name = (hrefOrName || '').split('?')[0]; // quita querystring
    const last = name.split('/').pop();            // toma archivo
    return last || ''; // '' cuando es raíz
  }

  function checkPageAccess(pageName) {
    const name = normalizePageName(pageName);
    console.log('[NAV] Verificando acceso a:', name || '(root)');

    // Si es pública, no exigir sesión
    if (PUBLIC_PAGES.includes(name)) {
      console.log('[NAV] Página pública, sin restricción de sesión');
      return true;
    }

    // Si NO es pública, exige sesión
    if (!isAuthenticated()) {
      console.log('[NAV] No autenticado → redirigiendo a login');
      try { localStorage.setItem(REDIRECT_KEY, name || 'index_v2.html'); } catch (_){}
      window.location.href = 'login.html';
      return false;
    }

    // Sesión OK. Refresca window.currentUser si existe user en storage.
    const u = getCurrentUser();
    if (u) {
      // No redeclaramos, solo asignamos si existe o creamos propiedad en window
      window.currentUser = Object.assign({}, window.currentUser || {}, u, { isAuthenticated: true });
      console.log('[NAV] Sesión válida para:', window.currentUser.username, '-', window.currentUser.rol);
    } else {
      console.warn('[NAV] userData inválido en storage → redirigiendo a login');
      try { localStorage.setItem(REDIRECT_KEY, name || 'index_v2.html'); } catch (_){}
      window.location.href = 'login.html';
      return false;
    }

    return true;
  }

  // -------------------------------
  // Navegación programática
  // -------------------------------
  function navigateTo(page) {
    console.log('Navegando a:', page);
    const name = normalizePageName(page);

    if (!PUBLIC_PAGES.includes(name)) {
      if (!isAuthenticated()) {
        console.log('Se requiere autenticación');
        try { localStorage.setItem(REDIRECT_KEY, page); } catch (_){}
        window.location.href = 'login.html';
        return;
      }
    }

    window.location.href = page;
  }

  // -------------------------------
  // Vistas internas (SPA parcial)
  // (estas funciones muestran/ocultan secciones dentro de index_v2.html)
  // -------------------------------
  function hideAll(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function showMenu() {
    hideAll(['moduloCaptura', 'menuVisualizacion', 'visualizacionDetalle']);
    const menu = document.getElementById('menuPrincipal');
    if (menu) menu.classList.remove('hidden');
    console.log('[NAV] Mostrando menú principal');
  }

  function showCaptura() {
    hideAll(['menuPrincipal', 'menuVisualizacion', 'visualizacionDetalle']);
    const el = document.getElementById('moduloCaptura');
    if (el) el.classList.remove('hidden');
    // Inicialización perezosa si aplica
    if (typeof window.inicializarModuloCaptura === 'function') {
      try { window.inicializarModuloCaptura(); } catch(e){ console.warn('[NAV] init captura error:', e); }
    }
    console.log('[NAV] Mostrando módulo de captura');
  }

  function showVisualizacion() {
    hideAll(['menuPrincipal', 'moduloCaptura', 'visualizacionDetalle']);
    const el = document.getElementById('menuVisualizacion');
    if (el) el.classList.remove('hidden');
    console.log('[NAV] Mostrando menú de visualización');
  }

  function showVisualizacionDetalle(tipo) {
    // Oculta los otros
    const menuVis = document.getElementById('menuVisualizacion');
    if (menuVis) menuVis.classList.add('hidden');

    const detalle = document.getElementById('visualizacionDetalle');
    if (detalle) detalle.classList.remove('hidden');

    const titulo = document.getElementById('tituloDetalle');
    if (titulo) {
      const titulos = {
        pasajeros:  'Visualización - Pasajeros',
        operaciones:'Visualización - Operaciones',
        carga:      'Visualización - Carga'
      };
      titulo.textContent = titulos[tipo] || 'Visualización';
    }

    console.log('[NAV] Mostrando detalle de visualización:', tipo);
  }

  function irAMenuAreas() {
    const u = getCurrentUser();
    const rol = u?.rol || window.currentUser?.rol;
    if (rol === 'subdirector') {
      window.location.href = 'menu_subdirector.html';
    } else if (rol === 'administrador') {
      window.location.href = 'menu_administrador.html';
    } else {
      alert('No tiene permisos para acceder al menú de áreas');
    }
  }

  // -------------------------------
  // Hook al cargar documento
  // -------------------------------
  function onReady() {
    const name = normalizePageName(window.location.pathname);
    console.log('[NAV] DOM listo. Página actual:', name || '(root)');

    // Aplica guard
    const ok = checkPageAccess(name);
    if (!ok) return;

    // Si venimos de login con redirect almacenado, podríamos manejarlo aquí (opcional)
    // const redirectTo = localStorage.getItem(REDIRECT_KEY);
    // if (redirectTo && name === 'index_v2.html') {
    //   localStorage.removeItem(REDIRECT_KEY);
    //   navigateTo(redirectTo);
    // }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // -------------------------------
  // Exponer API pública
  // -------------------------------
  window.readSession = readSession;
  window.isAuthenticated = isAuthenticated;
  window.getCurrentUser = getCurrentUser;
  window.clearSessionEverywhere = clearSessionEverywhere;

  window.navigateTo = navigateTo;
  window.showMenu = showMenu;
  window.showCaptura = showCaptura;
  window.showVisualizacion = showVisualizacion;
  window.showVisualizacionDetalle = showVisualizacionDetalle;
  window.irAMenuAreas = irAMenuAreas;
})();
