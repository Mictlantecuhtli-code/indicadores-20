// ====================================
// ARCHIVO: auth.js - PARTE 1/6
// Sistema de autenticación para AIFA
// ====================================

/**
 * Estado global de autenticación
 */
let authState = {
    isLoading: false,
    loginAttempts: 0,
    maxLoginAttempts: 3,
    lockoutTime: 15 * 60 * 1000, // 15 minutos
    lastLoginAttempt: null
};

/**
 * Función principal de login
 */
async function iniciarSesion(username, password, recordarme = false) {
    log('Iniciando proceso de login', { username, recordarme });
    
    try {
        // Verificar si hay bloqueo por intentos fallidos
        if (estaBloqueado()) {
            const tiempoRestante = getTiempoBloqueoRestante();
            mostrarNotificacion(`Demasiados intentos fallidos. Intente nuevamente en ${Math.ceil(tiempoRestante / 60000)} minutos`, 'error');
            return { success: false, error: 'BLOQUEADO' };
        }
        
        // Validar entrada
        if (!validarCredenciales(username, password)) {
            return { success: false, error: 'DATOS_INVALIDOS' };
        }
        
        authState.isLoading = true;
        mostrarCargandoLogin(true);
        
        // Buscar usuario en la base de datos
        const { data: usuario, error } = await sb
            .from('usuarios')
            .select('*')
            .eq('username', username.toLowerCase().trim())
            .eq('activo', true)
            .single();
        
        if (error || !usuario) {
            logError('Usuario no encontrado', error);
            registrarIntentoFallido();
            mostrarNotificacion(MENSAJES.ERROR_LOGIN, 'error');
            return { success: false, error: 'USUARIO_NO_ENCONTRADO' };
        }
        
        // Verificar contraseña (simulación - en producción usar hash real)
        const passwordValida = await verificarPassword(password, usuario.password_hash);
        
        if (!passwordValida) {
            logError('Contraseña incorrecta');
            registrarIntentoFallido();
            mostrarNotificacion(MENSAJES.ERROR_LOGIN, 'error');
            return { success: false, error: 'PASSWORD_INCORRECTA' };
        }
        
        // Login exitoso
        const sesionData = await crearSesion(usuario, recordarme);
        
        log('Login exitoso', { usuario: usuario.username, rol: usuario.rol });
        mostrarNotificacion(MENSAJES.LOGIN_EXITOSO, 'success');
        
        return { 
            success: true, 
            usuario: sesionData.usuario,
            token: sesionData.token 
        };
        
    } catch (error) {
        logError('Error en iniciarSesion', error);
        mostrarNotificacion(MENSAJES.ERROR_AUTENTICACION, 'error');
        return { success: false, error: 'ERROR_INTERNO' };
    } finally {
        authState.isLoading = false;
        mostrarCargandoLogin(false);
    }
}

/**
 * Verificar contraseña (simulación simple - mejorar en producción)
 */
async function verificarPassword(passwordPlano, passwordHash) {
    // NOTA: En producción usar bcrypt.compare() real
    // Por ahora usamos comparación simple para development
    const passwordsComunes = {
        'admin123': '$2b$10$rQoFgVpJVHOZNcDOVdFqbu4hOZVDvV3QjnU3iGcvw6YnZBzJYGZIu'
    };
    
    return passwordsComunes[passwordPlano] === passwordHash;
}

/**
 * Crear sesión después de login exitoso
 */
async function crearSesion(usuario, recordarme) {
    try {
        // Generar token único
        const token = generarToken();
        const expiresAt = new Date();
        
        if (recordarme) {
            expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.remember_me_days);
        } else {
            expiresAt.setHours(expiresAt.getHours() + SESSION_CONFIG.expires_hours);
        }
        
        // Guardar sesión en base de datos (opcional)
        const { error: errorSesion } = await sb
            .from('sesiones')
            .insert({
                usuario_id: usuario.id,
                token: token,
                expires_at: expiresAt.toISOString(),
                ip_address: await obtenerIP(),
                user_agent: navigator.userAgent
            });
        
        if (errorSesion) {
            logError('Error creando sesión en BD', errorSesion);
        }
        
        // Configurar usuario global
        const permisos = PERMISOS[usuario.rol] || PERMISOS[ROLES.CAPTURISTA];
        
        currentUser = {
            id: usuario.id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol,
            area: usuario.area,
            permisos: permisos,
            isAuthenticated: true
        };
        
        // Guardar en localStorage
        guardarSesionLocal(token, currentUser, recordarme);
        
        // Resetear intentos fallidos
        authState.loginAttempts = 0;
        authState.lastLoginAttempt = null;
        
        return {
            usuario: currentUser,
            token: token
        };
        
    } catch (error) {
        logError('Error en crearSesion', error);
        throw error;
    }
}
// ====================================
// ARCHIVO: auth.js - PARTE 2/6
// Funciones de sesión y validación
// ====================================

/**
 * Verificar sesión existente al cargar la aplicación
 */
async function verificarSesionExistente() {
    log('Verificando sesión existente');
    
    try {
        const token = localStorage.getItem(SESSION_CONFIG.token_key);
        const userData = localStorage.getItem(SESSION_CONFIG.user_key);
        
        if (!token || !userData) {
            log('No hay sesión guardada localmente');
            return { valid: false };
        }
        
        const user = JSON.parse(userData);
        
        // Verificar si el token no ha expirado
        const { data: sesion, error } = await sb
            .from('sesiones')
            .select('*')
            .eq('token', token)
            .eq('activa', true)
            .single();
        
        if (error || !sesion) {
            log('Token no válido o no encontrado en BD');
            limpiarSesionLocal();
            return { valid: false };
        }
        
        // Verificar expiración
        const ahora = new Date();
        const expiracion = new Date(sesion.expires_at);
        
        if (ahora > expiracion) {
            log('Token expirado');
            await invalidarSesion(token);
            limpiarSesionLocal();
            return { valid: false, expired: true };
        }
        
        // Verificar que el usuario sigue activo
        const { data: usuario, error: errorUsuario } = await sb
            .from('usuarios')
            .select('*')
            .eq('id', sesion.usuario_id)
            .eq('activo', true)
            .single();
        
        if (errorUsuario || !usuario) {
            log('Usuario no encontrado o inactivo');
            await invalidarSesion(token);
            limpiarSesionLocal();
            return { valid: false };
        }
        
        // Restaurar sesión
        const permisos = PERMISOS[usuario.rol] || PERMISOS[ROLES.CAPTURISTA];
        
        currentUser = {
            id: usuario.id,
            username: usuario.username,
            email: usuario.email,
            rol: usuario.rol,
            area: usuario.area,
            permisos: permisos,
            isAuthenticated: true
        };
        
        log('Sesión restaurada exitosamente', { username: usuario.username, rol: usuario.rol });
        return { valid: true, user: currentUser };
        
    } catch (error) {
        logError('Error verificando sesión existente', error);
        limpiarSesionLocal();
        return { valid: false };
    }
}

/**
 * Cerrar sesión
 */
async function cerrarSesion() {
    log('Cerrando sesión');
    
    try {
        const token = localStorage.getItem(SESSION_CONFIG.token_key);
        
        if (token) {
            // Invalidar token en la base de datos
            await invalidarSesion(token);
        }
        
        // Limpiar datos locales
        limpiarSesionLocal();
        
        // Resetear usuario global
        currentUser = {
            id: null,
            username: null,
            email: null,
            rol: null,
            area: null,
            permisos: null,
            isAuthenticated: false
        };
        
        // Limpiar contexto de la aplicación
        if (typeof limpiarContextoAplicacion === 'function') {
            limpiarContextoAplicacion();
        }
        
        mostrarNotificacion(MENSAJES.LOGOUT_EXITOSO, 'success');
        
        // Redirigir al login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
        return true;
        
    } catch (error) {
        logError('Error cerrando sesión', error);
        // Forzar limpieza local aunque haya error
        limpiarSesionLocal();
        window.location.href = 'login.html';
        return false;
    }
}

/**
 * Invalidar token en la base de datos
 */
async function invalidarSesion(token) {
    try {
        const { error } = await sb
            .from('sesiones')
            .update({ activa: false })
            .eq('token', token);
        
        if (error) {
            logError('Error invalidando sesión en BD', error);
        }
    } catch (error) {
        logError('Error en invalidarSesion', error);
    }
}

/**
 * Validar credenciales de entrada
 */
function validarCredenciales(username, password) {
    if (!username || !password) {
        mostrarNotificacion('Por favor ingrese usuario y contraseña', 'error');
        return false;
    }
    
    if (username.length < VALIDACIONES.USERNAME_MIN_LENGTH) {
        mostrarNotificacion(`El usuario debe tener al menos ${VALIDACIONES.USERNAME_MIN_LENGTH} caracteres`, 'error');
        return false;
    }
    
    if (password.length < VALIDACIONES.PASSWORD_MIN_LENGTH) {
        mostrarNotificacion(`La contraseña debe tener al menos ${VALIDACIONES.PASSWORD_MIN_LENGTH} caracteres`, 'error');
        return false;
    }
    
    return true;
}

/**
 * Gestión de intentos fallidos
 */
function registrarIntentoFallido() {
    authState.loginAttempts++;
    authState.lastLoginAttempt = Date.now();
    
    log('Intento de login fallido', { 
        intentos: authState.loginAttempts, 
        maximo: authState.maxLoginAttempts 
    });
    
    if (authState.loginAttempts >= authState.maxLoginAttempts) {
        const tiempoBloqueo = Math.ceil(authState.lockoutTime / 60000);
        mostrarNotificacion(`Demasiados intentos fallidos. Cuenta bloqueada por ${tiempoBloqueo} minutos`, 'error');
    }
}

function estaBloqueado() {
    if (authState.loginAttempts < authState.maxLoginAttempts) {
        return false;
    }
    
    if (!authState.lastLoginAttempt) {
        return false;
    }
    
    const tiempoTranscurrido = Date.now() - authState.lastLoginAttempt;
    return tiempoTranscurrido < authState.lockoutTime;
}

function getTiempoBloqueoRestante() {
    if (!estaBloqueado()) {
        return 0;
    }
    
    const tiempoTranscurrido = Date.now() - authState.lastLoginAttempt;
    return authState.lockoutTime - tiempoTranscurrido;
}
// ====================================
// ARCHIVO: auth.js - PARTE 3/6
// Funciones de utilidad y almacenamiento
// ====================================

/**
 * Funciones de almacenamiento local
 */
function guardarSesionLocal(token, userData, recordarme) {
    try {
        if (recordarme) {
            // Usar localStorage para sesiones persistentes
            localStorage.setItem(SESSION_CONFIG.token_key, token);
            localStorage.setItem(SESSION_CONFIG.user_key, JSON.stringify(userData));
        } else {
            // Usar sessionStorage para sesiones temporales
            sessionStorage.setItem(SESSION_CONFIG.token_key, token);
            sessionStorage.setItem(SESSION_CONFIG.user_key, JSON.stringify(userData));
            
            // También guardar en localStorage pero con expiración corta
            localStorage.setItem(SESSION_CONFIG.token_key, token);
            localStorage.setItem(SESSION_CONFIG.user_key, JSON.stringify(userData));
        }
        
        log('Sesión guardada localmente', { recordarme, username: userData.username });
    } catch (error) {
        logError('Error guardando sesión local', error);
    }
}

function limpiarSesionLocal() {
    try {
        // Limpiar localStorage
        localStorage.removeItem(SESSION_CONFIG.token_key);
        localStorage.removeItem(SESSION_CONFIG.user_key);
        
        // Limpiar sessionStorage
        sessionStorage.removeItem(SESSION_CONFIG.token_key);
        sessionStorage.removeItem(SESSION_CONFIG.user_key);
        
        log('Sesión local limpiada');
    } catch (error) {
        logError('Error limpiando sesión local', error);
    }
}

/**
 * Funciones de utilidad
 */
function generarToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 15);
    const userAgent = navigator.userAgent.slice(0, 10);
    
    return `aifa_${timestamp}_${random}_${btoa(userAgent)}`;
}

async function obtenerIP() {
    try {
        // En producción, usar un servicio real para obtener IP
        return '127.0.0.1';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Funciones de UI para login
 */
function mostrarCargandoLogin(mostrar) {
    const btnLogin = document.getElementById('btnLogin');
    const spinner = document.getElementById('loginSpinner');
    
    if (btnLogin) {
        if (mostrar) {
            btnLogin.disabled = true;
            btnLogin.textContent = 'Iniciando sesión...';
            if (spinner) spinner.classList.remove('hidden');
        } else {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar Sesión';
            if (spinner) spinner.classList.add('hidden');
        }
    }
}

function limpiarFormularioLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const recordarmeCheck = document.getElementById('recordarme');
    
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (recordarmeCheck) recordarmeCheck.checked = false;
}

/**
 * Funciones de redirección según rol
 */
function redirigirSegunRol(usuario) {
    log('Redirigiendo según rol', { rol: usuario.rol, area: usuario.area });
    
    switch(usuario.rol) {
        case ROLES.CAPTURISTA:
            // Capturistas van directamente al sistema actual
            window.location.href = 'index_v2.html';
            break;
            
        case ROLES.SUBDIRECTOR:
            // Subdirectores van al menú de áreas
            window.location.href = 'menu_subdirector.html';
            break;
            
        case ROLES.ADMINISTRADOR:
            // Administradores van a su menú específico
            window.location.href = 'menu_administrador.html';
            break;
        case ROLES.GENERAL:
            // General va a su menú específico
            window.location.href = 'menu_general.html';
            break;
            
        default:
            logError('Rol no reconocido', usuario.rol);
            mostrarNotificacion('Error: Rol de usuario no válido', 'error');
            cerrarSesion();
    }
}

/**
 * Verificar autenticación antes de cargar páginas
 */
async function verificarAutenticacionRequerida() {
    const paginaActual = window.location.pathname.split('/').pop();
    const paginasPublicas = ['login.html', 'index.html', '', 'construccion.html'];
    
    // Si estamos en una página pública, no verificar autenticación
    if (paginasPublicas.includes(paginaActual)) {
        return;
    }
    
    log('Verificando autenticación requerida', { pagina: paginaActual });
    
    const sesion = await verificarSesionExistente();
    
    if (!sesion.valid) {
        if (sesion.expired) {
            mostrarNotificacion(MENSAJES.ERROR_SESION_EXPIRADA, 'warning');
        }
        
        log('Sesión no válida, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar permisos específicos de la página
    if (!verificarPermisosSeccion(paginaActual)) {
        mostrarNotificacion(MENSAJES.ERROR_PERMISOS, 'error');
        redirigirSegunRol(currentUser);
        return;
    }
    
    log('Autenticación verificada correctamente');
}

/**
 * Verificar permisos para secciones específicas
 */
function verificarPermisosSeccion(pagina) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    const permisos = currentUser.permisos;
    
    switch(pagina) {
        case 'index_v2.html':
            return permisos.puede_capturar || permisos.puede_ver_historico;
            
        case 'menu_subdirector.html':
            return currentUser.rol === ROLES.SUBDIRECTOR || currentUser.rol === ROLES.ADMINISTRADOR;
            
        case 'menu_administrador.html':
            return currentUser.rol === ROLES.ADMINISTRADOR;

        case 'menu_general.html':
            return currentUser.rol === ROLES.GENERAL;
            
        case 'vista_general.html':
            return currentUser.rol === ROLES.GENERAL;
            
        case 'admin_usuarios.html':
            return permisos.puede_administrar_usuarios;
            
        default:
            // Para páginas no especificadas, permitir acceso si está autenticado
            return true;
    }
}

/**
 * Función de inicialización de autenticación
 */
async function inicializarAutenticacion() {
    log('Inicializando sistema de autenticación');
    
    const paginaActual = window.location.pathname.split('/').pop();
    
    // Si estamos en login, verificar si ya hay sesión activa
    if (paginaActual === 'login.html') {
        const sesion = await verificarSesionExistente();
        if (sesion.valid) {
            log('Sesión activa encontrada, redirigiendo');
            redirigirSegunRol(currentUser);
            return;
        }
    } else {
        // Para otras páginas, verificar autenticación
        await verificarAutenticacionRequerida();
    }
    
    log('Autenticación inicializada');
}
// ====================================
// ARCHIVO: auth.js - PARTE 4/6
// Middleware de autorización y validaciones avanzadas
// ====================================

/**
 * Middleware para verificar permisos antes de ejecutar funciones
 */
function requierePermiso(permiso) {
    return function(target, propertyName, descriptor) {
        const metodo = descriptor.value;
        
        descriptor.value = function(...args) {
            if (!verificarPermisos(permiso)) {
                mostrarNotificacion(MENSAJES.ERROR_PERMISOS, 'error');
                return Promise.reject(new Error('PERMISOS_INSUFICIENTES'));
            }
            
            return metodo.apply(this, args);
        };
        
        return descriptor;
    };
}

/**
 * Verificar acceso a datos por año (para capturistas)
 */
function verificarAccesoAnio(anio) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    if (currentUser.rol === ROLES.ADMINISTRADOR) {
        return true;
    }
    
    if (currentUser.rol === ROLES.SUBDIRECTOR) {
        return puedeAccederAnio(anio);
    }
    
    // Capturistas solo pueden ver año actual
    if (currentUser.rol === ROLES.CAPTURISTA) {
        return anio === new Date().getFullYear();
    }
    
    return false;
}

/**
 * Filtrar datos según permisos del usuario
 */
function filtrarDatosSegunPermisos(datos, filtros = {}) {
    if (!currentUser.isAuthenticated || !Array.isArray(datos)) {
        return [];
    }
    
    let datosFiltrados = [...datos];
    
    // Filtrar por año según rol
    if (currentUser.rol === ROLES.CAPTURISTA) {
        const anioActual = new Date().getFullYear();
        datosFiltrados = datosFiltrados.filter(item => {
            return item.anio === anioActual || item.año === anioActual;
        });
    }
    
    // Filtrar por área según asignación
    if (currentUser.area && currentUser.rol !== ROLES.ADMINISTRADOR) {
        datosFiltrados = datosFiltrados.filter(item => {
            return item.area === currentUser.area || !item.area;
        });
    }
    
    // Aplicar filtros adicionales si los hay
    if (filtros.anio && verificarAccesoAnio(filtros.anio)) {
        datosFiltrados = datosFiltrados.filter(item => 
            item.anio === filtros.anio || item.año === filtros.anio
        );
    }
    
    if (filtros.area && puedeAccederArea(filtros.area)) {
        datosFiltrados = datosFiltrados.filter(item => item.area === filtros.area);
    }
    
    return datosFiltrados;
}

/**
 * Validar operación de escritura (guardar/editar/eliminar)
 */
function validarOperacionEscritura(operacion, datos = {}) {
    if (!currentUser.isAuthenticated) {
        mostrarNotificacion('Debe iniciar sesión para realizar esta operación', 'error');
        return false;
    }
    
    // Verificar permisos básicos
    if (!verificarPermisos('capturar') && operacion === 'crear') {
        mostrarNotificacion(MENSAJES.ERROR_PERMISOS, 'error');
        return false;
    }
    
    if (!verificarPermisos('editar') && (operacion === 'actualizar' || operacion === 'eliminar')) {
        mostrarNotificacion(MENSAJES.ERROR_PERMISOS, 'error');
        return false;
    }
    
    // Verificar acceso al año (para capturistas)
    if (datos.anio && !verificarAccesoAnio(datos.anio)) {
        mostrarNotificacion('No tiene permisos para modificar datos de este año', 'error');
        return false;
    }
    
    // Verificar acceso al área
    if (datos.area && !puedeAccederArea(datos.area)) {
        mostrarNotificacion(MENSAJES.ERROR_AREA_NO_AUTORIZADA, 'error');
        return false;
    }
    
    return true;
}

/**
 * Interceptor para todas las consultas a Supabase
 */
function interceptarConsultaSupabase(tabla, operacion, filtros = {}) {
    log('Interceptando consulta Supabase', { tabla, operacion, usuario: currentUser.username });
    
    // Verificar autenticación
    if (!currentUser.isAuthenticated) {
        throw new Error('SESION_REQUERIDA');
    }
    
    // Aplicar filtros de seguridad automáticamente
    let filtrosSeguridad = { ...filtros };
    
    // Para capturistas, limitar automáticamente al año actual
    if (currentUser.rol === ROLES.CAPTURISTA && tabla === 'medicion') {
        filtrosSeguridad.anio = new Date().getFullYear();
    }
    
    // Para subdirectores, limitar a su área asignada
    if (currentUser.rol === ROLES.SUBDIRECTOR && currentUser.area && tabla === 'medicion') {
        filtrosSeguridad.area = currentUser.area;
    }
    
    return filtrosSeguridad;
}

/**
 * Verificar integridad de sesión periódicamente
 */
function iniciarVerificacionPeriodica() {
    const intervalId = setInterval(async () => {
        if (!currentUser.isAuthenticated) {
            clearInterval(intervalId);
            return;
        }
        
        try {
            const token = localStorage.getItem(SESSION_CONFIG.token_key);
            if (!token) {
                log('Token no encontrado, cerrando sesión');
                await cerrarSesion();
                return;
            }
            
            // Verificar si el token sigue siendo válido
            const { data: sesion, error } = await sb
                .from('sesiones')
                .select('expires_at, activa')
                .eq('token', token)
                .single();
            
            if (error || !sesion || !sesion.activa) {
                log('Token inválido detectado, cerrando sesión');
                await cerrarSesion();
                return;
            }
            
            // Verificar expiración
            const ahora = new Date();
            const expiracion = new Date(sesion.expires_at);
            
            if (ahora > expiracion) {
                log('Token expirado detectado, cerrando sesión');
                await cerrarSesion();
                return;
            }
            
            // Verificar si falta poco para expirar (5 minutos)
            const tiempoRestante = expiracion.getTime() - ahora.getTime();
            const cincoMinutos = 5 * 60 * 1000;
            
            if (tiempoRestante <= cincoMinutos && tiempoRestante > 0) {
                mostrarNotificacion('Su sesión expirará pronto. Guarde su trabajo.', 'warning');
            }
            
        } catch (error) {
            logError('Error en verificación periódica', error);
        }
    }, 60000); // Verificar cada minuto
    
    return intervalId;
}

/**
 * Función para renovar token antes de que expire
 */
async function renovarToken() {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    try {
        const tokenActual = localStorage.getItem(SESSION_CONFIG.token_key);
        if (!tokenActual) {
            return false;
        }
        
        // Generar nuevo token
        const nuevoToken = generarToken();
        const nuevaExpiracion = new Date();
        nuevaExpiracion.setHours(nuevaExpiracion.getHours() + SESSION_CONFIG.expires_hours);
        
        // Actualizar en base de datos
        const { error } = await sb
            .from('sesiones')
            .update({
                token: nuevoToken,
                expires_at: nuevaExpiracion.toISOString()
            })
            .eq('token', tokenActual);
        
        if (error) {
            logError('Error renovando token', error);
            return false;
        }
        
        // Actualizar en localStorage
        localStorage.setItem(SESSION_CONFIG.token_key, nuevoToken);
        
        log('Token renovado exitosamente');
        mostrarNotificacion('Sesión renovada automáticamente', 'success');
        
        return true;
        
    } catch (error) {
        logError('Error en renovarToken', error);
        return false;
    }
}
// ====================================
// ARCHIVO: auth.js - PARTE 5/6
// Administración de usuarios y funciones avanzadas
// ====================================

/**
 * Funciones de administración de usuarios (solo para administradores)
 */
async function crearUsuario(datosUsuario) {
    if (!verificarPermisos('administrar_usuarios')) {
        throw new Error('PERMISOS_INSUFICIENTES');
    }
    
    try {
        // Validar datos del usuario
        const validacion = validarDatosUsuario(datosUsuario);
        if (!validacion.valido) {
            throw new Error(validacion.mensaje);
        }
        
        // Verificar que el username no exista
        const { data: usuarioExistente } = await sb
            .from('usuarios')
            .select('id')
            .eq('username', datosUsuario.username.toLowerCase())
            .single();
        
        if (usuarioExistente) {
            throw new Error('El nombre de usuario ya existe');
        }
        
        // Verificar que el email no exista
        const { data: emailExistente } = await sb
            .from('usuarios')
            .select('id')
            .eq('email', datosUsuario.email.toLowerCase())
            .single();
        
        if (emailExistente) {
            throw new Error('El correo electrónico ya está registrado');
        }
        
        // Crear hash de contraseña (simulado)
        const passwordHash = await generarHashPassword(datosUsuario.password);
        
        // Insertar usuario
        const { data: nuevoUsuario, error } = await sb
            .from('usuarios')
            .insert({
                username: datosUsuario.username.toLowerCase(),
                email: datosUsuario.email.toLowerCase(),
                password_hash: passwordHash,
                rol: datosUsuario.rol,
                area: datosUsuario.area || null,
                created_by: currentUser.id
            })
            .select()
            .single();
        
        if (error) {
            logError('Error creando usuario', error);
            throw new Error('Error al crear el usuario');
        }
        
        log('Usuario creado exitosamente', { 
            id: nuevoUsuario.id, 
            username: nuevoUsuario.username,
            rol: nuevoUsuario.rol 
        });
        
        return {
            success: true,
            usuario: {
                id: nuevoUsuario.id,
                username: nuevoUsuario.username,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol,
                area: nuevoUsuario.area
            }
        };
        
    } catch (error) {
        logError('Error en crearUsuario', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function actualizarUsuario(idUsuario, datosActualizacion) {
    if (!verificarPermisos('administrar_usuarios')) {
        throw new Error('PERMISOS_INSUFICIENTES');
    }
    
    try {
        // No permitir que se modifique a sí mismo ciertos campos críticos
        if (idUsuario === currentUser.id && datosActualizacion.rol) {
            throw new Error('No puede modificar su propio rol');
        }
        
        const datosLimpios = {};
        
        // Solo incluir campos permitidos
        if (datosActualizacion.email) {
            if (!VALIDACIONES.EMAIL_PATTERN.test(datosActualizacion.email)) {
                throw new Error('Formato de email inválido');
            }
            datosLimpios.email = datosActualizacion.email.toLowerCase();
        }
        
        if (datosActualizacion.rol && Object.values(ROLES).includes(datosActualizacion.rol)) {
            datosLimpios.rol = datosActualizacion.rol;
        }
        
        if (datosActualizacion.area) {
            datosLimpios.area = datosActualizacion.area;
        }
        
        if (datosActualizacion.activo !== undefined) {
            datosLimpios.activo = Boolean(datosActualizacion.activo);
        }
        
        if (datosActualizacion.password) {
            if (datosActualizacion.password.length < VALIDACIONES.PASSWORD_MIN_LENGTH) {
                throw new Error(`La contraseña debe tener al menos ${VALIDACIONES.PASSWORD_MIN_LENGTH} caracteres`);
            }
            datosLimpios.password_hash = await generarHashPassword(datosActualizacion.password);
        }
        
        datosLimpios.updated_at = new Date().toISOString();
        
        const { data: usuarioActualizado, error } = await sb
            .from('usuarios')
            .update(datosLimpios)
            .eq('id', idUsuario)
            .select()
            .single();
        
        if (error) {
            logError('Error actualizando usuario', error);
            throw new Error('Error al actualizar el usuario');
        }
        
        log('Usuario actualizado exitosamente', { id: idUsuario });
        
        return {
            success: true,
            usuario: usuarioActualizado
        };
        
    } catch (error) {
        logError('Error en actualizarUsuario', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function listarUsuarios(filtros = {}) {
    if (!verificarPermisos('administrar_usuarios')) {
        throw new Error('PERMISOS_INSUFICIENTES');
    }
    
    try {
        let query = sb
            .from('usuarios')
            .select('id, username, email, rol, area, activo, created_at, updated_at')
            .order('created_at', { ascending: false });
        
        // Aplicar filtros
        if (filtros.rol) {
            query = query.eq('rol', filtros.rol);
        }
        
        if (filtros.area) {
            query = query.eq('area', filtros.area);
        }
        
        if (filtros.activo !== undefined) {
            query = query.eq('activo', filtros.activo);
        }
        
        const { data: usuarios, error } = await query;
        
        if (error) {
            logError('Error listando usuarios', error);
            throw new Error('Error al cargar la lista de usuarios');
        }
        
        return {
            success: true,
            usuarios: usuarios || []
        };
        
    } catch (error) {
        logError('Error en listarUsuarios', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Funciones de validación de usuarios
 */
function validarDatosUsuario(datos) {
    if (!datos.username || datos.username.length < VALIDACIONES.USERNAME_MIN_LENGTH) {
        return {
            valido: false,
            mensaje: `El usuario debe tener al menos ${VALIDACIONES.USERNAME_MIN_LENGTH} caracteres`
        };
    }
    
    if (!datos.email || !VALIDACIONES.EMAIL_PATTERN.test(datos.email)) {
        return {
            valido: false,
            mensaje: 'El email debe tener formato válido @aifa.aero'
        };
    }
    
    if (!datos.password || datos.password.length < VALIDACIONES.PASSWORD_MIN_LENGTH) {
        return {
            valido: false,
            mensaje: `La contraseña debe tener al menos ${VALIDACIONES.PASSWORD_MIN_LENGTH} caracteres`
        };
    }
    
    if (!datos.rol || !Object.values(ROLES).includes(datos.rol)) {
        return {
            valido: false,
            mensaje: 'Debe seleccionar un rol válido'
        };
    }
    
    // Validar área según el rol
    if (datos.rol === ROLES.CAPTURISTA && !datos.area) {
        return {
            valido: false,
            mensaje: 'Los capturistas deben tener un área asignada'
        };
    }
    
    if (datos.rol === ROLES.SUBDIRECTOR && !datos.area) {
        return {
            valido: false,
            mensaje: 'Los subdirectores deben tener un área asignada'
        };
    }
    
    return { valido: true };
}

async function generarHashPassword(password) {
    // Simulación simple - en producción usar bcrypt real
    return '$2b$10$rQoFgVpJVHOZNcDOVdFqbu4hOZVDvV3QjnU3iGcvw6YnZBzJYGZIu';
}

/**
 * Funciones de auditoría y logs de seguridad
 */
async function registrarEventoSeguridad(evento, detalles = {}) {
    try {
        const eventoData = {
            usuario_id: currentUser.id || null,
            evento: evento,
            detalles: JSON.stringify(detalles),
            ip_address: await obtenerIP(),
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        log('Evento de seguridad registrado', { evento, usuario: currentUser.username });
        
        // En producción, guardar en tabla de auditoría
        // await sb.from('auditoria_seguridad').insert(eventoData);
        
    } catch (error) {
        logError('Error registrando evento de seguridad', error);
    }
}

/**
 * Función de limpieza de contexto al cambiar usuario
 */
function limpiarContextoAplicacion() {
    // Limpiar variables globales del sistema
    if (typeof currentChart !== 'undefined' && currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    if (typeof visualChart !== 'undefined' && visualChart) {
        visualChart.destroy();
        visualChart = null;
    }
    
    // Resetear contexto de visualización
    if (typeof vContext !== 'undefined') {
        vContext.modo = null;
        vContext.currentData = null;
        vContext.currentFilters = null;
    }
    
    // Limpiar datos de captura si existen
    if (typeof capturaData !== 'undefined') {
        capturaData.datosActuales = [];
        capturaData.selectedArea = null;
        capturaData.selectedIndicador = null;
    }
    
    log('Contexto de aplicación limpiado');
}
// ====================================
// ARCHIVO: auth.js - PARTE 6/6 (FINAL)
// Eventos, inicialización y funciones globales
// ====================================

/**
 * Event listeners para el formulario de login
 */
function configurarEventosLogin() {
    const formLogin = document.getElementById('formLogin');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');
    const recordarmeCheck = document.getElementById('recordarme');
    
    if (formLogin) {
        formLogin.addEventListener('submit', async function(e) {
            e.preventDefault();
            await manejarSubmitLogin();
        });
    }
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (passwordInput) passwordInput.focus();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                manejarSubmitLogin();
            }
        });
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', function(e) {
            e.preventDefault();
            manejarSubmitLogin();
        });
    }
    
    // Mostrar/ocultar contraseña
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
}

/**
 * Manejar submit del formulario de login
 */
async function manejarSubmitLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const recordarmeInput = document.getElementById('recordarme');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const recordarme = recordarmeInput ? !!recordarmeInput.checked : false;
    
    if (!username || !password) {
        mostrarNotificacion('Por favor complete todos los campos', 'error');
        return;
    }
    
    const resultado = await iniciarSesion(username, password, recordarme);
    
    if (resultado.success) {
        // Registrar evento de seguridad
        await registrarEventoSeguridad('LOGIN_EXITOSO', {
            username: username,
            recordarme: recordarme
        });
        
        // Limpiar formulario
        limpiarFormularioLogin();
        
        // Redirigir según rol después de un breve delay
        setTimeout(() => {
            redirigirSegunRol(resultado.usuario);
        }, 1500);
        
    } else {
        // Registrar intento fallido
        await registrarEventoSeguridad('LOGIN_FALLIDO', {
            username: username,
            error: resultado.error
        });
    }
}

/**
 * Configurar eventos de cierre de sesión
 */
function configurarEventosCierreSesion() {
    // Buscar botones de logout en toda la aplicación
    const botonesCerrarSesion = document.querySelectorAll('[data-action="logout"], .btn-logout, #btnLogout');
    
    botonesCerrarSesion.forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.preventDefault();
            confirmarCierreSesion();
        });
    });
    
    // Cerrar sesión al cerrar ventana/pestaña
    window.addEventListener('beforeunload', function() {
        if (currentUser.isAuthenticated) {
            // Solo invalidar token, no mostrar confirmación
            const token = localStorage.getItem(SESSION_CONFIG.token_key);
            if (token) {
                navigator.sendBeacon('/api/logout', JSON.stringify({ token }));
            }
        }
    });
}

function confirmarCierreSesion() {
    const confirmar = confirm('¿Está seguro que desea cerrar sesión?');
    if (confirmar) {
        cerrarSesion();
    }
}

/**
 * Funciones de utilidad para UI
 */
function mostrarInfoUsuario() {
    const elementosUsername = document.querySelectorAll('[data-user="username"]');
    const elementosRol = document.querySelectorAll('[data-user="rol"]');
    const elementosArea = document.querySelectorAll('[data-user="area"]');
    
    if (currentUser.isAuthenticated) {
        elementosUsername.forEach(el => el.textContent = currentUser.username);
        elementosRol.forEach(el => el.textContent = currentUser.rol);
        elementosArea.forEach(el => el.textContent = currentUser.area || 'N/A');
    }
}

function ocultarElementosSegunPermisos() {
    // Ocultar elementos que requieren permisos específicos
    const elementosAdmin = document.querySelectorAll('[data-require="administrar_usuarios"]');
    const elementosEdicion = document.querySelectorAll('[data-require="editar"]');
    const elementosHistorico = document.querySelectorAll('[data-require="ver_historico"]');
    
    if (!verificarPermisos('administrar_usuarios')) {
        elementosAdmin.forEach(el => el.style.display = 'none');
    }
    
    if (!verificarPermisos('editar')) {
        elementosEdicion.forEach(el => el.style.display = 'none');
    }
    
    if (!verificarPermisos('ver_historico')) {
        elementosHistorico.forEach(el => el.style.display = 'none');
    }
}

/**
 * Función principal de inicialización
 */
async function inicializarSistemaAuth() {
    log('Inicializando sistema de autenticación completo');
    
    try {
        // Configurar eventos según la página actual
        const paginaActual = window.location.pathname.split('/').pop();
        
        if (paginaActual === 'login.html') {
            configurarEventosLogin();
        } else {
            configurarEventosCierreSesion();
            
            // Solo verificar autenticación si no estamos en login
            await verificarAutenticacionRequerida();
            
            if (currentUser.isAuthenticated) {
                mostrarInfoUsuario();
                ocultarElementosSegunPermisos();
                
                // Iniciar verificación periódica
                iniciarVerificacionPeriodica();
            }
        }
        
        log('Sistema de autenticación inicializado correctamente');
        
    } catch (error) {
        logError('Error inicializando sistema de autenticación', error);
        mostrarNotificacion('Error inicializando la aplicación', 'error');
    }
}

/**
 * Funciones globales para usar desde otros archivos
 */
window.authSystem = {
    // Funciones principales
    iniciarSesion,
    cerrarSesion,
    verificarSesionExistente,
    
    // Funciones de permisos
    verificarPermisos,
    puedeAccederArea,
    puedeAccederAnio,
    
    // Funciones de validación
    validarOperacionEscritura,
    filtrarDatosSegunPermisos,
    
    // Funciones de administración (solo admins)
    crearUsuario,
    actualizarUsuario,
    listarUsuarios,
    
    // Funciones de utilidad
    redirigirSegunRol,
    mostrarInfoUsuario,
    registrarEventoSeguridad,
    
    // Estado actual
    getCurrentUser: () => currentUser,
    isAuthenticated: () => currentUser.isAuthenticated
};

/**
 * Funciones para mantener compatibilidad con código existente
 */
window.verificarPermisos = verificarPermisos;
window.puedeAccederArea = puedeAccederArea;
window.puedeAccederAnio = puedeAccederAnio;
window.cerrarSesion = cerrarSesion;

/**
 * Inicialización automática cuando se carga el DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaAuth();
});

/**
 * Manejo de errores globales relacionados con autenticación
 */
window.addEventListener('error', function(event) {
    if (event.error && event.error.message === 'SESION_REQUERIDA') {
        mostrarNotificacion(MENSAJES.ERROR_SESION_EXPIRADA, 'warning');
        cerrarSesion();
    }
});

/**
 * Interceptar fetch requests para agregar tokens automáticamente
 */
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const token = localStorage.getItem(SESSION_CONFIG.token_key);
    
    if (token && args[1]) {
        if (!args[1].headers) {
            args[1].headers = {};
        }
        args[1].headers['Authorization'] = `Bearer ${token}`;
    }
    
    return originalFetch.apply(this, args);
};

// Log de confirmación de carga
log('Módulo de autenticación auth.js cargado completamente');

/**
 * Función de debugging para desarrollo
 */
function debugAuth() {
    console.group('🔐 DEBUG SISTEMA DE AUTENTICACIÓN');
    console.table({
        'Usuario Autenticado': currentUser.isAuthenticated,
        'Username': currentUser.username || 'N/A',
        'Rol': currentUser.rol || 'N/A',
        'Área': currentUser.area || 'N/A',
        'Token Presente': !!localStorage.getItem(SESSION_CONFIG.token_key),
        'Intentos de Login': authState.loginAttempts,
        'Bloqueado': estaBloqueado()
    });
    
    if (currentUser.permisos) {
        console.log('🛡️ Permisos del usuario:', currentUser.permisos);
    }
    
    console.groupEnd();
}

// Exponer función de debug globalmente
window.debugAuth = debugAuth;
