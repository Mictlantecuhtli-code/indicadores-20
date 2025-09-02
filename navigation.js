// ====================================
// ARCHIVO 5: navigation.js
// Funciones de navegación entre módulos
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
 * Función principal para mostrar el menú principal
 */
function showMenu() {
    log('Navegando a menú principal');
    
    // Limpiar gráficas al salir de otros módulos
    limpiarGraficasAlCambiarModulo();
    
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
}

/**
 * Función para mostrar el módulo de captura
 */
function showCaptura() {
    log('Navegando a módulo de captura');
    
    // Limpiar gráficas anteriores
    limpiarGraficasAlCambiarModulo();
    
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
    
    // Inicializar módulo de captura
    try {
        inicializarModuloCaptura();
    } catch (error) {
        logError('Error al inicializar módulo de captura', error);
        mostrarNotificacion('Error al cargar el módulo de captura', 'error');
    }
}

/**
 * Función para mostrar el menú de visualización
 */
function showVisualizacion() {
    log('Navegando a menú de visualización');
    
    // Limpiar gráficas anteriores
    limpiarGraficasAlCambiarModulo();
    
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
}

/**
 * Función para mostrar el detalle de visualización
 */
function showVisualizacionDetalle(modo) {
    log('Navegando a detalle de visualización', { modo });
    
    if (!modo || !['pasajeros', 'operaciones', 'carga'].includes(modo)) {
        logError('Modo de visualización inválido', modo);
        mostrarNotificacion('Modo de visualización inválido', 'error');
        return;
    }
    
    // Limpiar gráficas anteriores
    limpiarGraficasAlCambiarModulo();
    
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
    
    // Inicializar filtros de visualización
    try {
        inicializarFiltrosVisualizacion();
    } catch (error) {
        logError('Error al inicializar filtros de visualización', error);
        mostrarNotificacion('Error al cargar los filtros', 'error');
    }
}

/**
 * Funciones auxiliares de navegación
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
    
    titulo.textContent = textoTitulo;
}

function resetearContexto() {
    vContext.modo = null;
    vContext.currentData = null;
    vContext.currentFilters = null;
}

/**
 * Gestión del historial de navegación
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

function navegarAtras() {
    if (historialNavegacion.length < 2) {
        showMenu();
        return;
    }
    
    // Remover estado actual
    historialNavegacion.pop();
    
    // Obtener estado anterior
    const estadoAnterior = historialNavegacion[historialNavegacion.length - 1];
    
    switch(estadoAnterior) {
        case NAVEGACION_ESTADOS.MENU_PRINCIPAL:
            showMenu();
            break;
        case NAVEGACION_ESTADOS.MODULO_CAPTURA:
            showCaptura();
            break;
        case NAVEGACION_ESTADOS.MENU_VISUALIZACION:
            showVisualizacion();
            break;
        case NAVEGACION_ESTADOS.DETALLE_VISUALIZACION:
            // En este caso, mejor volver al menú de visualización
            showVisualizacion();
            break;
        default:
            showMenu();
    }
}

/**
 * Funciones de validación de navegación
 */
function puedeNavegar() {
    // Verificar si hay operaciones pendientes
    const botonesCargando = $$('button[disabled]');
    if (botonesCargando.length > 0) {
        mostrarNotificacion('Espere a que termine la operación actual', 'warning');
        return false;
    }
    
    return true;
}

function confirmarCambioModulo() {
    // Verificar si hay cambios sin guardar en captura
    if (estadoActual === NAVEGACION_ESTADOS.MODULO_CAPTURA) {
        const valor = $('#fValor')?.value;
        const meta = $('#fMeta')?.value;
        
        if (valor || meta) {
            return confirm('Hay datos sin guardar. ¿Está seguro de que desea salir?');
        }
    }
    
    return true;
}

/**
 * Navegación con validaciones
 */
function navegarConValidacion(funcionNavegacion) {
    if (!puedeNavegar()) return;
    
    if (!confirmarCambioModulo()) return;
    
    funcionNavegacion();
}

/**
 * Configurar eventos de navegación
 */
function configurarEventosNavegacion() {
    // Configurar navegación con teclas
    document.addEventListener('keydown', function(event) {
        // Alt + M = Menú principal
        if (event.altKey && event.key === 'm') {
            event.preventDefault();
            navegarConValidacion(showMenu);
        }
        
        // Alt + C = Captura
        if (event.altKey && event.key === 'c') {
            event.preventDefault();
            navegarConValidacion(showCaptura);
        }
        
        // Alt + V = Visualización
        if (event.altKey && event.key === 'v') {
            event.preventDefault();
            navegarConValidacion(showVisualizacion);
        }
        
        // Escape = Atrás
        if (event.key === 'Escape') {
            event.preventDefault();
            navegarConValidacion(navegarAtras);
        }
    });
    
    // Configurar navegación del navegador
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.modulo) {
            switch(event.state.modulo) {
                case 'captura':
                    showCaptura();
                    break;
                case 'visualizacion':
                    showVisualizacion();
                    break;
                default:
                    showMenu();
            }
        } else {
            showMenu();
        }
    });
}

/**
 * Actualizar URL (opcional, para compatibilidad con navegador)
 */
function actualizarURL(modulo) {
    if (typeof history !== 'undefined' && history.pushState) {
        const nuevaURL = `${window.location.pathname}?modulo=${modulo}`;
        history.pushState({ modulo: modulo }, '', nuevaURL);
    }
}

/**
 * Inicializar navegación desde URL
 */
function inicializarDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const modulo = urlParams.get('modulo');
    
    switch(modulo) {
        case 'captura':
            showCaptura();
            break;
        case 'visualizacion':
            showVisualizacion();
            break;
        default:
            showMenu();
    }
}

/**
 * Funciones de breadcrumb (migas de pan)
 */
function actualizarBreadcrumb() {
    const breadcrumb = $('#breadcrumb');
    if (!breadcrumb) return;
    
    let ruta = '';
    switch(estadoActual) {
        case NAVEGACION_ESTADOS.MENU_PRINCIPAL:
            ruta = 'Inicio';
            break;
        case NAVEGACION_ESTADOS.MODULO_CAPTURA:
            ruta = 'Inicio > Captura';
            break;
        case NAVEGACION_ESTADOS.MENU_VISUALIZACION:
            ruta = 'Inicio > Visualización';
            break;
        case NAVEGACION_ESTADOS.DETALLE_VISUALIZACION:
            const modoTexto = vContext.modo ? 
                vContext.modo.charAt(0).toUpperCase() + vContext.modo.slice(1) : '';
            ruta = `Inicio > Visualización > ${modoTexto}`;
            break;
        default:
            ruta = 'Inicio';
    }
    
    breadcrumb.textContent = ruta;
}

/**
 * Funciones de estado de carga
 */
function mostrarEstadoCargaModulo(mostrar = true, mensaje = 'Cargando...') {
    const overlay = $('#loadingOverlay');
    if (!overlay) return;
    
    if (mostrar) {
        overlay.classList.remove('hidden');
        const mensajeElement = $('#loadingMessage');
        if (mensajeElement) {
            mensajeElement.textContent = mensaje;
        }
    } else {
        overlay.classList.add('hidden');
    }
}

/**
 * Inicialización del módulo de navegación
 */
function inicializarNavegacion() {
    log('Inicializando módulo de navegación');
    
    configurarEventosNavegacion();
    
    // Inicializar desde URL si es necesario
    // inicializarDesdeURL();
    
    log('Módulo de navegación inicializado');
}

/**
 * Obtener estado actual de navegación
 */
function obtenerEstadoNavegacion() {
    return {
        estadoActual: estadoActual,
        historial: [...historialNavegacion],
        contexto: { ...vContext }
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
        'Modo Visualización': estado.contexto.modo || 'N/A'
    });
}

// Exponer funciones globales necesarias
window.showMenu = function() { navegarConValidacion(showMenu); };
window.showCaptura = function() { navegarConValidacion(showCaptura); };
window.showVisualizacion = function() { navegarConValidacion(showVisualizacion); };
window.showVisualizacionDetalle = function(modo) { navegarConValidacion(() => showVisualizacionDetalle(modo)); };

// Inicializar cuando se carga el documento
document.addEventListener('DOMContentLoaded', function() {
    inicializarNavegacion();
});
