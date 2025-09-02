// ====================================
// ARCHIVO 5: navigation.js (REESCRITO)
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
}

/**
 * Función para mostrar el módulo de captura
 */
function showCaptura() {
    log('Navegando a módulo de captura');
    
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
    
    // Inicializar módulo de captura
    try {
        if (typeof inicializarModuloCaptura === 'function') {
            inicializarModuloCaptura();
        }
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
    
    // Inicializar filtros de visualización
    try {
        if (typeof inicializarFiltrosVisualizacion === 'function') {
            inicializarFiltrosVisualizacion();
        }
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
 * Configurar eventos de navegación
 */
function configurarEventosNavegacion() {
    // Configurar navegación con teclas
    document.addEventListener('keydown', function(event) {
        // Alt + M = Menú principal
        if (event.altKey && event.key === 'm') {
            event.preventDefault();
            if (puedeNavegar() && confirmarCambioModulo()) {
                showMenu();
            }
        }
        
        // Alt + C = Captura
        if (event.altKey && event.key === 'c') {
            event.preventDefault();
            if (puedeNavegar() && confirmarCambioModulo()) {
                showCaptura();
            }
        }
        
        // Alt + V = Visualización
        if (event.altKey && event.key === 'v') {
            event.preventDefault();
            if (puedeNavegar() && confirmarCambioModulo()) {
                showVisualizacion();
            }
        }
        
        // Escape = Atrás
        if (event.key === 'Escape') {
            event.preventDefault();
            if (puedeNavegar() && confirmarCambioModulo()) {
                navegarAtras();
            }
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

/**
 * Inicialización del módulo de navegación
 */
function inicializarNavegacion() {
    log('Inicializando módulo de navegación');
    configurarEventosNavegacion();
    log('Módulo de navegación inicializado');
}

// Exponer funciones globales necesarias - SIN BUCLES
window.showMenu = showMenu;
window.showCaptura = showCaptura;
window.showVisualizacion = showVisualizacion;
window.showVisualizacionDetalle = showVisualizacionDetalle;

// Inicializar cuando se carga el documento
document.addEventListener('DOMContentLoaded', function() {
    inicializarNavegacion();
});
