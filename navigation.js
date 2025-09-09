// ====================================
// ARCHIVO 5: navigation.js (CON AUTENTICACIÓN)
// Funciones de navegación entre módulos con validaciones de seguridad
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
 * Verificar autenticación antes de cualquier navegación
 */
async function verificarAutenticacionNavegacion() {
    if (!currentUser.isAuthenticated) {
        log('Usuario no autenticado, redirigiendo a login');
        mostrarNotificacion('Debe iniciar sesión para acceder al sistema', 'warning');
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar que la sesión siga siendo válida
    const sesionValida = await authSystem.verificarSesionExistente();
    if (!sesionValida.valid) {
        log('Sesión inválida detectada durante navegación');
        mostrarNotificacion(MENSAJES.ERROR_SESION_EXPIRADA, 'error');
        await cerrarSesion();
        return false;
    }
    
    return true;
}

/**
 * Función principal para mostrar el menú principal
 */
async function showMenu() {
    log('Navegando a menú principal');
    
    // Verificar autenticación
    if (!await verificarAutenticacionNavegacion()) {
        return;
    }
    
    // Verificar permisos básicos
    if (!verificarPermisos('capturar') && !verificarPermisos('ver_historico')) {
        mostrarNotificacion(MENSAJES.ERROR_PERMISOS, 'error');
        authSystem.redirigirSegunRol(currentUser);
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
    
    // Registrar evento de navegación
    if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('NAVEGACION_MENU_PRINCIPAL');
    }
}

/**
 * Función para mostrar el módulo de captura
 */
async function showCaptura() {
    log('Navegando a módulo de captura');
    
    // Verificar autenticación y permisos
    if (!await verificarAutenticacionNavegacion()) {
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
            await inicializarModuloCapturaConPermisos();
        }
    } catch (error) {
        logError('Error al inicializar módulo de captura', error);
        mostrarNotificacion('Error al cargar el módulo de captura', 'error');
    }
    
    // Registrar evento de navegación
    if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('NAVEGACION_MODULO_CAPTURA');
    }
}

/**
 * Inicializar módulo de captura con restricciones de permisos
 */
async function inicializarModuloCapturaConPermisos() {
    // Llamar inicialización original
    await inicializarModuloCaptura();
    
    // Aplicar restricciones específicas por rol
    if (currentUser.rol === ROLES.CAPTURISTA) {
        // Capturistas solo pueden ver año actual
        const anioSelect = $('#fAnio');
        if (anioSelect) {
            // Limpiar y solo mostrar año actual
            anioSelect.innerHTML = `<option value="${ANO_ACTUAL}">${ANO_ACTUAL}</option>`;
            anioSelect.disabled = true;
        }
        
        // Limitar áreas según asignación
        const areaSelect = $('#fArea');
        if (areaSelect && currentUser.area) {
            // Solo mostrar el área asignada
            const areaNombre = AREAS[currentUser.area] || currentUser.area;
            areaSelect.innerHTML = `
                <option value="">Seleccionar...</option>
                <option value="${currentUser.area}">${areaNombre}</option>
            `;
        }
    }
    
    log('Módulo de captura inicializado con restricciones de permisos');
}
// ====================================
// ARCHIVO 5: navigation.js - PARTE 2/4
// Funciones de visualización con validaciones de seguridad
// ====================================

/**
 * Función para mostrar el menú de visualización
 */
async function showVisualizacion() {
    log('Navegando a menú de visualización');
    
    // Verificar autenticación y permisos
    if (!await verificarAutenticacionNavegacion()) {
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
    
    // Registrar evento de navegación
    if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('NAVEGACION_MENU_VISUALIZACION');
    }
}

/**
 * Función para mostrar el detalle de visualización con validaciones
 */
async function showVisualizacionDetalle(modo) {
    log('Navegando a detalle de visualización', { modo });
    
    // Verificar autenticación
    if (!await verificarAutenticacionNavegacion()) {
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
            await inicializarFiltrosVisualizacionConPermisos();
        }
    } catch (error) {
        logError('Error al inicializar filtros de visualización', error);
        mostrarNotificacion('Error al cargar los filtros', 'error');
    }
    
    // Registrar evento de navegación
    if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('NAVEGACION_DETALLE_VISUALIZACION', {
            modo: modo,
            area: areaRequerida
        });
    }
}

/**
 * Inicializar filtros de visualización con restricciones de permisos
 */
async function inicializarFiltrosVisualizacionConPermisos() {
    // Llamar inicialización original
    await inicializarFiltrosVisualizacion();
    
    // Aplicar restricciones específicas por rol
    if (currentUser.rol === ROLES.CAPTURISTA) {
        // Capturistas solo pueden ver año actual
        const anioSelect = $('#vAnio');
        if (anioSelect) {
            // Limpiar y solo mostrar año actual
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
 * Funciones auxiliares de navegación con validaciones
 */
function obtenerAreaPorModo(modo) {
    switch(modo) {
        case 'pasajeros':
        case 'operaciones':
            return 'operaciones'; // Ambos pertenecen al área de operaciones
        case 'carga':
            return 'carga';
        default:
            return null;
    }
}

function aplicarRestriccionesUI() {
    // Aplicar restricciones generales según el rol del usuario
    
    // Ocultar elementos que requieren permisos específicos
    const elementosEdicion = document.querySelectorAll('[data-require="editar"]');
    const elementosHistorico = document.querySelectorAll('[data-require="ver_historico"]');
    const elementosAdmin = document.querySelectorAll('[data-require="administrar_usuarios"]');
    
    if (!verificarPermisos('editar')) {
        elementosEdicion.forEach(el => {
            el.style.display = 'none';
        });
    }
    
    if (!verificarPermisos('ver_historico')) {
        elementosHistorico.forEach(el => {
            el.style.display = 'none';
        });
    }
    
    if (!verificarPermisos('administrar_usuarios')) {
        elementosAdmin.forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Agregar indicadores visuales para capturistas
    if (currentUser.rol === ROLES.CAPTURISTA) {
        const restriccionNotice = document.createElement('div');
        restriccionNotice.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4';
        restriccionNotice.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm">
                        <strong>Acceso limitado:</strong> Solo puede visualizar y capturar datos del año ${ANO_ACTUAL}.
                    </p>
                </div>
            </div>
        `;
        
        const container = document.querySelector('.container');
        if (container && container.firstChild) {
            container.insertBefore(restriccionNotice, container.firstChild.nextSibling);
        }
    }
}

function aplicarRestriccionesVisualizacion() {
    // Aplicar restricciones específicas del módulo de visualización
    
    // Para capturistas, agregar texto explicativo
    if (currentUser.rol === ROLES.CAPTURISTA) {
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
// ====================================
// ARCHIVO 5: navigation.js - PARTE 3/4
// Funciones auxiliares y validaciones avanzadas
// ====================================

/**
 * Funciones auxiliares de navegación con seguridad mejorada
 */
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
    if (currentUser.rol === ROLES.CAPTURISTA) {
        textoTitulo += ` (${ANO_ACTUAL})`;
    }
    
    titulo.textContent = textoTitulo;
}

function resetearContexto() {
    vContext.modo = null;
    vContext.currentData = null;
    vContext.currentFilters = null;
}

/**
 * Gestión del historial de navegación con validaciones
 */
function actualizarHistorialNavegacion(nuevoEstado) {
    // Evitar duplicados consecutivos
    if (historialNavegacion.length === 0 || historialNavegacion[historialNavegacion.length - 1] !== nuevoEstado) {
        historialNavegacion.push(nuevoEstado);
        
        // Limitar historial a los últimos 10 elementos
        if (historialNavegacion.length > 10) {
            historialNavegacion.shift();
        }
    }
}

async function navegarAtras() {
    log('Navegando hacia atrás en el historial');
    
    // Verificar autenticación antes de navegar
    if (!await verificarAutenticacionNavegacion()) {
        return;
    }
    
    if (historialNavegacion.length < 2) {
        await showMenu();
        return;
    }
    
    // Remover estado actual
    historialNavegacion.pop();
    
    // Obtener estado anterior
    const estadoAnterior = historialNavegacion[historialNavegacion.length - 1];
    
    switch(estadoAnterior) {
        case NAVEGACION_ESTADOS.MENU_PRINCIPAL:
            await showMenu();
            break;
        case NAVEGACION_ESTADOS.MODULO_CAPTURA:
            await showCaptura();
            break;
        case NAVEGACION_ESTADOS.MENU_VISUALIZACION:
            await showVisualizacion();
            break;
        case NAVEGACION_ESTADOS.DETALLE_VISUALIZACION:
            // En este caso, mejor volver al menú de visualización
            await showVisualizacion();
            break;
        default:
            await showMenu();
    }
}

/**
 * Funciones de validación de navegación mejoradas
 */
async function puedeNavegar() {
    // Verificar autenticación primero
    if (!currentUser.isAuthenticated) {
        mostrarNotificacion('Debe iniciar sesión para continuar', 'error');
        return false;
    }
    
    // Verificar si hay operaciones pendientes
    const botonesCargando = document.querySelectorAll('button[disabled]');
    if (botonesCargando.length > 0) {
        const operacionesPendientes = Array.from(botonesCargando).some(btn => 
            btn.textContent.includes('Cargando') || 
            btn.textContent.includes('Guardando') ||
            btn.textContent.includes('Procesando')
        );
        
        if (operacionesPendientes) {
            mostrarNotificacion('Espere a que termine la operación actual', 'warning');
            return false;
        }
    }
    
    return true;
}

async function confirmarCambioModulo() {
    // Verificar si hay cambios sin guardar en captura
    if (estadoActual === NAVEGACION_ESTADOS.MODULO_CAPTURA) {
        const valor = $('#fValor')?.value;
        const meta = $('#fMeta')?.value;
        
        if (valor || meta) {
            const confirmar = confirm('Hay datos sin guardar. ¿Está seguro de que desea salir?');
            if (!confirmar) {
                return false;
            }
            
            // Registrar evento de abandono con datos
            if (typeof registrarEventoSeguridad === 'function') {
                registrarEventoSeguridad('ABANDONO_CAPTURA_CON_DATOS', {
                    valor: valor || '',
                    meta: meta || ''
                });
            }
        }
    }
    
    return true;
}

/**
 * Función de navegación segura universal
 */
async function navegarA(destino, parametros = {}) {
    log('Navegación segura iniciada', { destino, parametros });
    
    try {
        // Verificaciones previas
        if (!await puedeNavegar()) {
            return false;
        }
        
        if (!await confirmarCambioModulo()) {
            return false;
        }
        
        // Ejecutar navegación según destino
        switch(destino) {
            case 'menu':
                await showMenu();
                break;
            case 'captura':
                await showCaptura();
                break;
            case 'visualizacion':
                await showVisualizacion();
                break;
            case 'visualizacion-detalle':
                if (parametros.modo) {
                    await showVisualizacionDetalle(parametros.modo);
                } else {
                    throw new Error('Modo requerido para visualización detalle');
                }
                break;
            case 'menu-subdirector':
                if (currentUser.rol === ROLES.SUBDIRECTOR || currentUser.rol === ROLES.ADMINISTRADOR) {
                    window.location.href = 'menu_subdirector.html';
                } else {
                    throw new Error('Sin permisos para acceder al menú de subdirector');
                }
                break;
            case 'login':
                await cerrarSesion();
                break;
            default:
                throw new Error(`Destino de navegación no válido: ${destino}`);
        }
        
        return true;
        
    } catch (error) {
        logError('Error en navegación segura', error);
        mostrarNotificacion(`Error de navegación: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Interceptor de navegación para URLs externas
 */
function interceptarNavegacionExterna() {
    // Interceptar clics en enlaces externos
    document.addEventListener('click', function(event) {
        const enlace = event.target.closest('a');
        if (!enlace) return;
        
        const href = enlace.getAttribute('href');
        if (!href) return;
        
        // Si es enlace externo y usuario está autenticado
        if (href.startsWith('http') && currentUser.isAuthenticated) {
            event.preventDefault();
            
            const confirmar = confirm(
                '¿Está seguro de que desea salir del sistema?\n\n' +
                'Su sesión permanecerá activa, pero perderá cualquier trabajo no guardado.'
            );
            
            if (confirmar) {
                // Registrar salida externa
                if (typeof registrarEventoSeguridad === 'function') {
                    registrarEventoSeguridad('NAVEGACION_EXTERNA', {
                        url: href,
                        origen: window.location.pathname
                    });
                }
                
                window.open(href, '_blank');
            }
        }
    });
}

/**
 * Función de limpieza al cambiar de página
 */
function limpiarEstadoNavegacion() {
    // Limpiar timers activos
    if (typeof clearInterval !== 'undefined') {
        // Limpiar intervalos de verificación periódica
        const intervalos = window.intervalosActivos || [];
        intervalos.forEach(id => clearInterval(id));
        window.intervalosActivos = [];
    }
    
    // Limpiar event listeners específicos
    document.removeEventListener('keydown', manejarTeclasNavegacion);
    
    // Resetear variables globales de navegación
    estadoActual = NAVEGACION_ESTADOS.MENU_PRINCIPAL;
    historialNavegacion = [];
    
    log('Estado de navegación limpiado');
}

/**
 * Manejo de errores de navegación
 */
function manejarErrorNavegacion(error, contexto = '') {
    logError(`Error de navegación${contexto ? ' en ' + contexto : ''}`, error);
    
    // Determinar acción según el tipo de error
    if (error.message.includes('autenticación') || error.message.includes('sesión')) {
        mostrarNotificacion('Su sesión ha expirado. Redirigiendo al login...', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } else if (error.message.includes('permisos')) {
        mostrarNotificacion('No tiene permisos para realizar esta acción', 'error');
        // Redirigir al menú apropiado según el rol
        setTimeout(() => {
            authSystem.redirigirSegunRol(currentUser);
        }, 2000);
    } else {
        mostrarNotificacion('Error de navegación. Intente nuevamente.', 'error');
        // Volver al menú principal como fallback
        setTimeout(() => {
            showMenu();
        }, 2000);
    }
}
// ====================================
// ARCHIVO 5: navigation.js - PARTE 4/4 (FINAL)
// Eventos, inicialización y funciones globales
// ====================================

/**
 * Configurar eventos de navegación con validaciones de seguridad
 */
function configurarEventosNavegacion() {
    log('Configurando eventos de navegación con validaciones de seguridad');
    
    // Configurar navegación con teclas (solo si está autenticado)
    document.addEventListener('keydown', manejarTeclasNavegacion);
    
    // Configurar interceptor de navegación externa
    interceptarNavegacionExterna();
    
    // Configurar navegación del navegador (botón atrás)
    window.addEventListener('popstate', manejarPopstate);
    
    // Configurar eventos de visibilidad de página
    document.addEventListener('visibilitychange', manejarCambioVisibilidad);
    
    // Configurar eventos antes de salir de la página
    window.addEventListener('beforeunload', manejarAntesDeRecargar);
    
    log('Eventos de navegación configurados');
}

/**
 * Manejar teclas de navegación
 */
async function manejarTeclasNavegacion(event) {
    // Solo procesar si está autenticado
    if (!currentUser.isAuthenticated) {
        return;
    }
    
    // Alt + M = Menú principal
    if (event.altKey && event.key === 'm') {
        event.preventDefault();
        if (await puedeNavegar() && await confirmarCambioModulo()) {
            await navegarA('menu');
        }
    }
    
    // Alt + C = Captura (solo si tiene permisos)
    if (event.altKey && event.key === 'c') {
        event.preventDefault();
        if (verificarPermisos('capturar') && await puedeNavegar() && await confirmarCambioModulo()) {
            await navegarA('captura');
        }
    }
    
    // Alt + V = Visualización (solo si tiene permisos)
    if (event.altKey && event.key === 'v') {
        event.preventDefault();
        if ((verificarPermisos('ver_historico') || verificarPermisos('capturar')) && await puedeNavegar() && await confirmarCambioModulo()) {
            await navegarA('visualizacion');
        }
    }
    
    // Alt + S = Menú subdirector (solo subdirectores y admins)
    if (event.altKey && event.key === 's') {
        event.preventDefault();
        if ((currentUser.rol === ROLES.SUBDIRECTOR || currentUser.rol === ROLES.ADMINISTRADOR) && await puedeNavegar()) {
            await navegarA('menu-subdirector');
        }
    }
    
    // Escape = Atrás
    if (event.key === 'Escape') {
        event.preventDefault();
        if (await puedeNavegar() && await confirmarCambioModulo()) {
            await navegarAtras();
        }
    }
    
    // F1 = Ayuda (futuro)
    if (event.key === 'F1') {
        event.preventDefault();
        mostrarAyudaContextual();
    }
}

/**
 * Manejar navegación del navegador
 */
async function manejarPopstate(event) {
    log('Manejando evento popstate');
    
    if (!currentUser.isAuthenticated) {
        window.location.href = 'login.html';
        return;
    }
    
    if (event.state && event.state.modulo) {
        switch(event.state.modulo) {
            case 'captura':
                if (verificarPermisos('capturar')) {
                    await showCaptura();
                } else {
                    await showMenu();
                }
                break;
            case 'visualizacion':
                if (verificarPermisos('ver_historico') || verificarPermisos('capturar')) {
                    await showVisualizacion();
                } else {
                    await showMenu();
                }
                break;
            default:
                await showMenu();
        }
    } else {
        await showMenu();
    }
}

/**
 * Manejar cambio de visibilidad de la página
 */
function manejarCambioVisibilidad() {
    if (document.hidden) {
        // Página oculta - pausar operaciones no críticas
        log('Página oculta - pausando operaciones');
        
        // Pausar animaciones si existen
        const elementos = document.querySelectorAll('.animate-pulse, .spinner');
        elementos.forEach(el => el.style.animationPlayState = 'paused');
        
    } else {
        // Página visible - verificar sesión
        log('Página visible - verificando sesión');
        
        if (currentUser.isAuthenticated) {
            // Verificar que la sesión siga válida
            authSystem.verificarSesionExistente().then(resultado => {
                if (!resultado.valid) {
                    mostrarNotificacion('Su sesión ha expirado', 'warning');
                    cerrarSesion();
                }
            });
        }
        
        // Reanudar animaciones
        const elementos = document.querySelectorAll('.animate-pulse, .spinner');
        elementos.forEach(el => el.style.animationPlayState = 'running');
    }
}

/**
 * Manejar antes de recargar/cerrar página
 */
function manejarAntesDeRecargar(event) {
    if (!currentUser.isAuthenticated) {
        return;
    }
    
    // Verificar si hay cambios sin guardar
    const valor = document.getElementById('fValor')?.value;
    const meta = document.getElementById('fMeta')?.value;
    
    if (valor || meta) {
        const mensaje = 'Hay datos sin guardar. ¿Está seguro de que desea salir?';
        event.returnValue = mensaje;
        return mensaje;
    }
    
    // Registrar evento de salida
    if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('SALIDA_APLICACION', {
            estado: estadoActual,
            tiempo_sesion: Date.now() - (currentUser.login_time || Date.now())
        });
    }
}

/**
 * Mostrar ayuda contextual
 */
function mostrarAyudaContextual() {
    const ayudas = {
        [NAVEGACION_ESTADOS.MENU_PRINCIPAL]: 'Use Alt+C para captura, Alt+V para visualización.',
        [NAVEGACION_ESTADOS.MODULO_CAPTURA]: 'Complete los campos y presione Guardar. Use Escape para volver.',
        [NAVEGACION_ESTADOS.MENU_VISUALIZACION]: 'Seleccione el tipo de indicador a visualizar.',
        [NAVEGACION_ESTADOS.DETALLE_VISUALIZACION]: 'Configure los filtros y presione Aplicar Filtros.'
    };
    
    const ayuda = ayudas[estadoActual] || 'Use las teclas Alt+M para menú, Escape para atrás.';
    
    mostrarNotificacion(ayuda, 'info', 5000);
}

/**
 * Obtener estado actual de navegación para debugging
 */
function obtenerEstadoNavegacion() {
    return {
        estadoActual: estadoActual,
        historial: [...historialNavegacion],
        contexto: { ...vContext },
        usuario: {
            autenticado: currentUser.isAuthenticated,
            rol: currentUser.rol,
            area: currentUser.area
        },
        permisos: currentUser.permisos
    };
}

/**
 * Debug de navegación
 */
function debugNavegacion() {
    const estado = obtenerEstadoNavegacion();
    console.table({
        'Estado Actual': estado.estadoActual,
        'Histórico': estado.historial.join(' > '),
        'Modo Visualización': estado.contexto.modo || 'N/A',
        'Usuario': estado.usuario.autenticado ? currentUser.username : 'No autenticado',
        'Rol': estado.usuario.rol || 'N/A',
        'Área': estado.usuario.area || 'N/A'
    });
    
    if (estado.permisos) {
        console.log('Permisos del usuario:', estado.permisos);
    }
}

/**
 * Inicialización del módulo de navegación
 */
async function inicializarNavegacion() {
    log('Inicializando módulo de navegación con autenticación');
    
    try {
        // Configurar eventos de navegación
        configurarEventosNavegacion();
        
        // Verificar autenticación inicial
        const paginaActual = window.location.pathname.split('/').pop();
        const paginasPublicas = ['login.html', ''];
        
        if (!paginasPublicas.includes(paginaActual)) {
            if (!currentUser.isAuthenticated) {
                log('Usuario no autenticado en página protegida');
                window.location.href = 'login.html';
                return;
            }
        }
        
        // Aplicar restricciones de UI iniciales
        aplicarRestriccionesUI();
        
        log('Módulo de navegación inicializado correctamente');
        
    } catch (error) {
        logError('Error inicializando navegación', error);
        manejarErrorNavegacion(error, 'inicialización');
    }
}

/**
 * Función de limpieza al destruir el módulo
 */
function destruirNavegacion() {
    log('Destruyendo módulo de navegación');
    
    // Remover event listeners
    document.removeEventListener('keydown', manejarTeclasNavegacion);
    window.removeEventListener('popstate', manejarPopstate);
    document.removeEventListener('visibilitychange', manejarCambioVisibilidad);
    window.removeEventListener('beforeunload', manejarAntesDeRecargar);
    
    // Limpiar estado
    limpiarEstadoNavegacion();
    
    log('Módulo de navegación destruido');
}

// ====================================
// EXPOSICIÓN DE FUNCIONES GLOBALES
// ====================================

// Funciones principales (sin bucles infinitos)
window.showMenu = showMenu;
window.showCaptura = showCaptura;
window.showVisualizacion = showVisualizacion;
window.showVisualizacionDetalle = showVisualizacionDetalle;

// Funciones de utilidad
window.navegarA = navegarA;
window.navegarAtras = navegarAtras;
window.debugNavegacion = debugNavegacion;
window.obtenerEstadoNavegacion = obtenerEstadoNavegacion;

// Inicializar cuando se carga el documento
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si no estamos en login
    const paginaActual = window.location.pathname.split('/').pop();
    if (paginaActual !== 'login.html') {
        inicializarNavegacion();
    }
});

// Limpiar al salir
window.addEventListener('unload', destruirNavegacion);

// Log de confirmación de carga
log('Módulo de navegación navigation.js cargado completamente con autenticación');

// ====================================
// FUNCIONES DE COMPATIBILIDAD
// ====================================

/**
 * Función para mantener compatibilidad con código existente
 */
function inicializarCompatibilidad() {
    // Asegurar que las funciones originales sigan funcionando
    if (typeof window.showMenu !== 'function') {
        window.showMenu = showMenu;
    }
    if (typeof window.showCaptura !== 'function') {
        window.showCaptura = showCaptura;
    }
    if (typeof window.showVisualizacion !== 'function') {
        window.showVisualizacion = showVisualizacion;
    }
    if (typeof window.showVisualizacionDetalle !== 'function') {
        window.showVisualizacionDetalle = showVisualizacionDetalle;
    }
}

// Ejecutar compatibilidad inmediatamente
inicializarCompatibilidad();
