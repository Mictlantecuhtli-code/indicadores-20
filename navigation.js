/**
 * Sistema de Navegación y Control de Acceso
 * Maneja la navegación entre páginas y verificación de permisos
 */

// Variable global para almacenar datos del usuario actual
//let currentUser = null;

/**
 * Inicializar sistema de navegación
 */
function initNavigation() {
    console.log('Inicializando sistema de navegación');
    
    // Verificar si hay una sesión activa
    const token = localStorage.getItem('aifa_auth_token');
    const userData = localStorage.getItem('aifa_user_data');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Usuario restaurado:', currentUser.username, currentUser.rol);
        } catch (error) {
            console.error('Error restaurando usuario:', error);
            currentUser = null;
        }
    }
    
    // Agregar event listeners para navegación
    document.addEventListener('DOMContentLoaded', function() {
        setupNavigationListeners();
        checkPageAccess();
    });
}

/**
 * Configurar listeners de navegación
 */
function setupNavigationListeners() {
    // Prevenir navegación con retroceso si no hay sesión
    window.addEventListener('popstate', function(event) {
        checkPageAccess();
    });
    
    // Interceptar clicks en enlaces
    document.addEventListener('click', function(event) {
        const link = event.target.closest('a');
        if (link && link.href && !link.target && !link.download) {
            const url = new URL(link.href);
            if (url.origin === window.location.origin) {
                event.preventDefault();
                navigateTo(url.pathname.split('/').pop());
            }
        }
    });
}

/**
 * Verificar acceso a la página actual
 */
function checkPageAccess() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Verificando acceso a:', currentPage);
    
    // Páginas que no requieren autenticación
    const publicPages = ['login.html', 'recuperar.html'];
    
    if (publicPages.includes(currentPage)) {
        return true;
    }
    
    // Verificar si hay sesión
    const token = localStorage.getItem('aifa_auth_token');
    const userData = localStorage.getItem('aifa_user_data');
    
    if (!token || !userData) {
        console.log('No hay sesión activa, redirigiendo a login');
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar permisos según la página
    try {
        const user = JSON.parse(userData);
        
        // Páginas con restricción de rol
        const pagePermissions = {
            'menu_administrador.html': ['administrador'],
            'menu_subdirector.html': ['subdirector', 'administrador'],
            'admin_usuarios.html': ['administrador'],
            'admin_areas.html': ['administrador']
        };
        
        if (pagePermissions[currentPage]) {
            const allowedRoles = pagePermissions[currentPage];
            if (!allowedRoles.includes(user.rol)) {
                console.log('Usuario no tiene permisos para esta página');
                alert('No tienes permisos para acceder a esta página');
                redirectToHome(user.rol);
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando permisos:', error);
        window.location.href = 'login.html';
        return false;
    }
}

/**
 * Navegar a una página específica
 * @param {string} page - Nombre de la página (ej: 'index.html')
 */
function navigateTo(page) {
    console.log('Navegando a:', page);
    
    // Verificar si la página requiere autenticación
    const publicPages = ['login.html', 'recuperar.html'];
    
    if (!publicPages.includes(page)) {
        const token = localStorage.getItem('aifa_auth_token');
        if (!token) {
            console.log('Se requiere autenticación');
            localStorage.setItem('aifa_redirect_after_login', page);
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Navegar a la página
    window.location.href = page;
}

/**
 * Redirigir al usuario según su rol
 * @param {string} rol - Rol del usuario
 */
function redirectToHome(rol) {
    console.log('Redirigiendo según rol:', rol);
    
    switch(rol) {
        case 'administrador':
            window.location.href = 'menu_administrador.html';
            break;
        case 'subdirector':
            window.location.href = 'menu_subdirector.html';
            break;
        case 'capturista':
            window.location.href = 'index_v2.html';
            break;
        default:
            window.location.href = 'index_v2.html';
    }
}

/**
 * Verificar si el usuario tiene un rol específico
 * @param {string} requiredRole - Rol requerido
 * @returns {boolean} - True si el usuario tiene el rol
 */
function checkUserRole(requiredRole) {
    const userData = localStorage.getItem('aifa_user_data');
    
    if (!userData) {
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        
        // Para administrador, verificación exacta
        if (requiredRole === 'administrador') {
            return user.rol === 'administrador';
        }
        
        // Para otros roles, verificación jerárquica
        const roleHierarchy = {
            'capturista': 1,
            'subdirector': 2,
            'administrador': 3
        };
        
        const userLevel = roleHierarchy[user.rol] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 999;
        
        return userLevel >= requiredLevel;
        
    } catch (error) {
        console.error('Error verificando rol:', error);
        return false;
    }
}

/**
 * Verificar si el usuario tiene permiso para un área específica
 * @param {string} area - Área a verificar
 * @returns {boolean} - True si tiene permiso
 */
function checkAreaPermission(area) {
    const userData = localStorage.getItem('aifa_user_data');
    
    if (!userData) {
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        
        // Administrador tiene acceso a todo
        if (user.rol === 'administrador') {
            return true;
        }
        
        // Verificar si el área está en los permisos del usuario
        if (user.area && user.area === area) {
            return true;
        }
        
        // Verificar permisos adicionales
        if (user.permisos && Array.isArray(user.permisos)) {
            return user.permisos.includes(area);
        }
        
        return false;
        
    } catch (error) {
        console.error('Error verificando permisos de área:', error);
        return false;
    }
}

/**
 * Obtener datos del usuario actual
 * @returns {Object|null} - Datos del usuario o null
 */
function getCurrentUser() {
    if (currentUser) {
        return currentUser;
    }
    
    const userData = localStorage.getItem('aifa_user_data');
    
    if (!userData) {
        return null;
    }
    
    try {
        currentUser = JSON.parse(userData);
        return currentUser;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

/**
 * Cerrar sesión
 */
function logout() {
    console.log('Cerrando sesión...');
    
    // Limpiar localStorage
    localStorage.removeItem('aifa_auth_token');
    localStorage.removeItem('aifa_user_data');
    localStorage.removeItem('aifa_session_expires');
    
    // Limpiar variable global
    currentUser = null;
    
    // Mostrar mensaje si existe la función
    if (typeof mostrarMensaje === 'function') {
        mostrarMensaje('Sesión cerrada correctamente', 'success');
    }
    
    // Redirigir a login después de un breve delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

/**
 * Verificar si la sesión ha expirado
 * @returns {boolean} - True si la sesión es válida
 */
function isSessionValid() {
    const token = localStorage.getItem('aifa_auth_token');
    const expires = localStorage.getItem('aifa_session_expires');
    
    if (!token) {
        return false;
    }
    
    if (expires) {
        const expirationTime = parseInt(expires);
        const now = Date.now();
        
        if (now > expirationTime) {
            console.log('Sesión expirada');
            logout();
            return false;
        }
    }
    
    return true;
}

/**
 * Renovar sesión (extender tiempo de expiración)
 */
function renewSession() {
    const token = localStorage.getItem('aifa_auth_token');
    
    if (token) {
        // Extender por 2 horas más
        const newExpiration = Date.now() + (2 * 60 * 60 * 1000);
        localStorage.setItem('aifa_session_expires', newExpiration.toString());
        console.log('Sesión renovada');
    }
}

/**
 * Mostrar información del usuario en la interfaz
 */
function mostrarInformacionUsuario() {
    const user = getCurrentUser();
    
    if (!user) {
        return;
    }
    
    // Actualizar nombre de usuario
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(element => {
        element.textContent = user.username || user.email;
    });
    
    // Actualizar rol
    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(element => {
        element.textContent = user.rol || 'Usuario';
    });
    
    // Actualizar área si existe
    const userAreaElements = document.querySelectorAll('.user-area');
    userAreaElements.forEach(element => {
        element.textContent = user.area || 'General';
    });
    
    // Actualizar menú de usuario si existe
    const userMenuName = document.getElementById('user-menu-name');
    if (userMenuName) {
        userMenuName.textContent = user.username || user.email;
    }
    
    const userMenuRole = document.getElementById('user-menu-role');
    if (userMenuRole) {
        userMenuRole.textContent = user.rol || 'Usuario';
    }
}

/**
 * Verificar acceso a función específica
 * @param {string} funcion - Nombre de la función a verificar
 * @returns {boolean} - True si tiene acceso
 */
function canAccess(funcion) {
    const user = getCurrentUser();
    
    if (!user) {
        return false;
    }
    
    // Definir permisos por rol
    const permissions = {
        'administrador': ['all'],
        'subdirector': ['view', 'edit', 'capture', 'export'],
        'capturista': ['view', 'capture']
    };
    
    const userPermissions = permissions[user.rol] || [];
    
    // Si tiene permiso 'all', puede hacer todo
    if (userPermissions.includes('all')) {
        return true;
    }
    
    // Verificar permiso específico
    return userPermissions.includes(funcion);
}

/**
 * Inicializar verificación periódica de sesión
 */
function initSessionCheck() {
    // Verificar sesión cada 5 minutos
    setInterval(() => {
        if (!isSessionValid()) {
            console.log('Sesión inválida, redirigiendo a login');
            window.location.href = 'login.html';
        }
    }, 5 * 60 * 1000);
    
    // Renovar sesión con actividad del usuario
    document.addEventListener('click', renewSession);
    document.addEventListener('keypress', renewSession);
}

// Inicializar cuando se carga el script
initNavigation();
initSessionCheck();

// Exportar funciones para uso global
window.navigateTo = navigateTo;
window.logout = logout;
window.checkUserRole = checkUserRole;
window.checkAreaPermission = checkAreaPermission;
window.getCurrentUser = getCurrentUser;
window.canAccess = canAccess;
window.mostrarInformacionUsuario = mostrarInformacionUsuario;
