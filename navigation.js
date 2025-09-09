// ====================================
// ARCHIVO 5: navigation.js (CORREGIDO SIN BUCLES)
// Funciones de navegación entre módulos con validaciones simplificadas
// ====================================

/**
 * Estados de navegación
 */
const NAVEGACION_ESTADOS = {
    MENU_PRINCIPAL: 'menuPrincipal',
    MODULO_CAPTURA: 'moduloCaptura',
    MENU_VISUALIZACION: 'menuVisualizacion',
    DETALLE_VISUALIZACION: 'visualizacionDetalle'
};

let estadoActual = NAVEGACION_ESTADOS.MENU_PRINCIPAL;
let historialNavegacion = [];

/**
 * Verificar autenticación simple (solo localStorage)
 */
function verificarAutenticacionSimple() {
    const token = localStorage.getItem('aifa_auth_token');
    const userData = localStorage.getItem('aifa_user_data');
    
    if (!token || !userData) {
        console.log('No hay sesión local válida');
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        
        // Restaurar currentUser si no está configurado
        if (!window.currentUser || !window.currentUser.isAuthenticated) {
            window.currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                rol: user.rol,
                area: user.area,
                permisos: user.permisos,
                isAuthenticated: true
            };
        }
        
        return true;
    } catch (error) {
        console.error('Error verificando sesión simple:', error);
        return false;
    }
}

/**
 * Función principal para mostrar el menú principal
 */
function showMenu() {
    log('Navegando a menú principal');
    
    // Verificar autenticación simple
    if (!verificarAutenticacionSimple()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Limpiar gráficas al salir de otros módulos
    destruirGraficas();
    
    // Ocultar todos los contenedores
    ocultarTodosLosModulos();
    
    // Mostrar menú principal
    const menuPrincipal = $('#menuPrincipal');
    if (menuPrincipal) {
        menuPrincipal.classList.remove('hidden');
    }
    
    // Actualizar estado
    estadoActual = NAVEGACION_ESTADOS.MENU_PRINCIPAL;
    actualizarHistorialNavegacion(NAVEGACION_ESTADOS.MENU_PRINCIPAL);
    
    // Resetear contexto
    resetearContexto();
    
    // Aplicar restricciones de UI según rol
    aplicarRestriccionesUI();
}

/**
 * Función para mostrar el módulo de captura
 */
function showCaptura() {
    log('Navegando a módulo de captura');
    
    // Verificar autenticación simple
    if (!verificarAutenticacionSimple()) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!verificarPermisos('capturar')) {
        mostrarNotificacion('No tiene permisos para capturar datos', 'error');
        return;
    }
    
    // Limpiar gráficas anteriores
    destruirGraficas();
    
    // Ocultar todos los módulos
    ocultarTodosLosModulos();
    
    // Mostrar módulo de captura
    const moduloCaptura = $('#moduloCaptura');
    if (moduloCaptura) {
        moduloCaptura.classList.remove('hidden');
    }
    
    // Actualizar estado
    estadoActual = NAVEGACION_ESTADOS.MODULO_CAPTURA;
    actualizarHistorialNavegacion(NAVEGACION_ESTADOS.MODULO_CAPTURA);
    
    // Inicializar módulo de captura con restricciones
    try {
        if (typeof inicializarModuloCaptura === 'function') {
            inicializarModuloCapturaConPermisos();
        }
    } catch (error) {
        logError('Error al inicializar módulo de captura', error);
        mostrarNotificacion('Error al cargar el módulo de captura', 'error');
    }
}

/**
 * Inicializar módulo de captura con restricciones de permisos
 */
function inicializarModuloCapturaConPermisos() {
    // Llamar inicialización original
    inicializarModuloCaptura();
    
    // Aplicar restricciones específicas por rol
    if (currentUser.rol === 'capturista') {
        // Capturistas solo pueden ver año actual
        const anioSelect = $('#fAnio');
        if (anioSelect) {
            anioSelect.innerHTML = `<option value="${ANO_ACTUAL}">${ANO_ACTUAL}</option>`;
            anioSelect.disabled = true;
        }
        
        // Limitar áreas según asignación
        const areaSelect = $('#fArea');
        if (areaSelect && currentUser.area) {
            const areaNombre = AREAS[currentUser.area] || currentUser.area;
            areaSelect.innerHTML = `
                <option value="">Seleccionar...</option>
                <option value="${currentUser.area}">${areaNombre}</option>
            `;
        }
    }
    
    log('Módulo de captura inicializado con restricciones de permisos');
}

/**
 * Función para mostrar el menú de visualización
 */
function showVisualizacion() {
    log('Navegando a menú de visualización');
    
    // Verificar autenticación simple
    if (!verificarAutenticacionSimple()) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!verificarPermisos('ver_historico') && !verificarPermisos('capturar')) {
        mostrarNotificacion('No tiene permisos para ver datos históricos', 'error');
        return;
    }
    
    // Limpiar gráficas anteriores
    destruirGraficas();
    
    // Ocultar todos los módulos
    ocultarTodosLosModulos();
    
    // Mostrar menú de visualización
    const menuVisualizacion = $('#menuVisualizacion');
    if (menuVisualizacion) {
        menuVisualizacion.classList.remove('hidden');
    }
    
    // Actualizar estado
    estadoActual = NAVEGACION_ESTADOS.MENU_VISUALIZACION;
    actualizarHistorialNavegacion(NAVEGACION_ESTADOS.MENU_VISUALIZACION);
    
    // Resetear contexto de visualización
    vContext.modo = null;
    
    // Aplicar restricciones de UI para visualización
    aplicarRestriccionesVisualizacion();
}

/**
 * Función para mostrar el detalle de visualización con validaciones
 */
function showVisualizacionDetalle(modo) {
    log('Navegando a detalle de visualización', { modo });
    
    // Verificar autenticación simple
    if (!verificarAutenticacionSimple()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Validar modo
    if (!modo || !['pasajeros', 'operaciones', 'carga'].includes(modo)) {
        logError('Modo de visualización inválido', modo);
        mostrarNotificacion('Modo de visualización inválido', 'error');
        return;
    }
    
    // Verificar permisos para visualización
    if (!verificarPermisos('ver_historico') && !verificarPermisos('capturar')) {
        mostrarNotificacion('No tiene permisos para acceder a la visualización', 'error');
        return;
    }
    
    // Verificar acceso al área específica según el modo
    const areaRequerida = obtenerAreaPorModo(modo);
    if (areaRequerida && !puedeAccederArea(areaRequerida)) {
        mostrarNotificacion(`No tiene acceso al área de ${areaRequerida}`, 'error');
        return;
    }
    
    // Limpiar gráficas anteriores
    destruirGraficas();
    
    // Actualizar contexto
    vContext.modo = modo;
    
    // Ocultar todos los módulos
    ocultarTodosLosModulos();
    
    // Mostrar detalle de visualización
    const detalleVisualizacion = $('#visualizacionDetalle');
    if (detalleVisualizacion) {
        detalleVisualizacion.classList.remove('hidden');
    }
    
    // Actualizar título según el modo
    actualizarTituloVisualizacion(modo);
    
    // Actualizar estado
    estadoActual = NAVEGACION_ESTADOS.DETALLE_VISUALIZACION;
    actualizarHistorialNavegacion(NAVEGACION_ESTADOS.DETALLE_VISUALIZACION);
    
    // Inicializar filtros de visualización con restricciones
    try {
        if (typeof inicializarFiltrosVisualizacion === 'function') {
            inicializarFiltrosVisualizacionConPermisos();
        }
    } catch (error) {
        logError('Error al inicializar filtros de visualización', error);
        mostrarNotificacion('Error al cargar los filtros', 'error');
    }
}

/**
 * Inicializar filtros de visualización con restricciones de permisos
 */
function inicializarFiltrosVisualizacionConPermisos() {
    // Llamar inicialización original
    inicializarFiltrosVisualizacion();
    
    // Aplicar restricciones específicas por rol
    if (currentUser.rol === 'capturista') {
        // Capturistas solo pueden ver año actual
        const anioSelect = $('#vAnio');
        if (anioSelect) {
            anioSelect.innerHTML = `<option value="${ANO_ACTUAL}">${ANO_ACTUAL}</option>`;
            anioSelect.disabled = true;
            anioSelect.classList.add('bg-gray-100');
        }
        
        // Ocultar opciones de comparación con años muy antiguos
        const compararSelect = $('#vComparar');
        if (compararSelect) {
            const opcionesPermitidas = [
                { valor: 'anterior', texto: 'Mismo periodo año anterior' }
            ];
            
            compararSelect.innerHTML = '';
            opcionesPermitidas.forEach(opcion => {
                const option = document.createElement('option');
                option.value = opcion.valor;
                option.textContent = opcion.texto;
                compararSelect.appendChild(option);
            });
        }
    }
    
    // Restringir escenarios según permisos
    if (!verificarPermisos('editar')) {
        const escenarioSelect = $('#vEscenario');
        if (escenarioSelect) {
            escenarioSelect.disabled = true;
            escenarioSelect.classList.add('bg-gray-100');
            escenarioSelect.title = 'Solo lectura - No tiene permisos de edición';
        }
    }
    
    log('Filtros de visualización inicializados con restricciones de permisos');
}

/**
 * Funciones auxiliares de navegación
 */
function obtenerAreaPorModo(modo) {
    switch(modo) {
        case 'pasajeros':
        case 'operaciones':
            return 'operaciones';
        case 'carga':
            return 'carga';
        default:
            return null;
    }
}

function ocultarTodosLosModulos() {
    const modulos = [
        '#menuPrincipal',
        '#moduloCaptura', 
        '#menuVisualizacion',
        '#visualizacionDetalle'
    ];
    
    modulos.forEach(moduloId => {
        const modulo = $(moduloId);
        if (modulo && !modulo.classList.contains('hidden')) {
            modulo.classList.add('hidden');
        }
    });
}

function actualizarTituloVisualizacion(modo) {
    const titulo = $('#tituloDetalle');
    if (!titulo) return;
    
    let textoTitulo = '';
    switch(modo) {
        case 'pasajeros':
            textoTitulo = 'Visualización - Pasajeros';
            break;
        case 'operaciones':
            textoTitulo = 'Visualización - Operaciones';
            break;
        case 'carga':
            textoTitulo = 'Visualización - Carga';
            break;
        default:
            textoTitulo = 'Visualización';
    }
    
    // Agregar indicador de restricciones si es capturista
    if (currentUser.rol === 'capturista') {
        textoTitulo += ` (${ANO_ACTUAL})`;
    }
    
    titulo.textContent = textoTitulo;
}

function resetearContexto() {
    vContext.modo = null;
    vContext.currentData = null;
    vContext.currentFilters = null;
}

function actualizarHistorialNavegacion(nuevoEstado) {
    if (historialNavegacion.length === 0 || historialNavegacion[historialNavegacion.length - 1] !== nuevoEstado) {
        historialNavegacion.push(nuevoEstado);
        
        if (historialNavegacion.length > 10) {
            historialNavegacion.shift();
        }
    }
}

function aplicarRestriccionesUI() {
    // Ocultar elementos que requieren permisos específicos
    const elementosEdicion = document.querySelectorAll('[data-require="editar"]');
    const elementosHistorico = document.querySelectorAll('[data-require="ver_historico"]');
    const elementosAdmin = document.querySelectorAll('[data-require="administrar_usuarios"]');
    
    if (!verificarPermisos('editar')) {
        elementosEdicion.forEach(el => el.style.display = 'none');
    }
    
    if (!verificarPermisos('ver_historico')) {
        elementosHistorico.forEach(el => el.style.display = 'none');
    }
    
    if (!verificarPermisos('administrar_usuarios')) {
        elementosAdmin.forEach(el => el.style.display = 'none');
    }
}

function aplicarRestriccionesVisualizacion() {
    if (currentUser.rol === 'capturista') {
        const menuVisualizacion = $('#menuVisualizacion');
        if (menuVisualizacion) {
            const notice = document.createElement('div');
            notice.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center';
            notice.innerHTML = `
                <p class="text-blue-800 font-medium">
                    Visualización limitada al año ${ANO_ACTUAL}
                </p>
                <p class="text-blue-600 text-sm mt-1">
                    Los datos históricos requieren permisos adicionales
                </p>
            `;
            
            const grid = menuVisualizacion.querySelector('.grid');
            if (grid) {
                menuVisualizacion.insertBefore(notice, grid);
            }
        }
    }
}

// FUNCIONES GLOBALES EXPOSTAS - SIN BUCLES DE INICIALIZACIÓN
window.showMenu = showMenu;
window.showCaptura = showCaptura;
window.showVisualizacion = showVisualizacion;
window.showVisualizacionDetalle = showVisualizacionDetalle;

// NOTA IMPORTANTE: Se eliminó la inicialización automática que causaba bucles
// La inicialización ahora debe ser manual desde cada página que la necesite

// Log de confirmación
log('Módulo de navegación navigation.js cargado (sin inicialización automática)');
