// ====================================
// ARCHIVO 2: config.js (CON AUTENTICACIÓN)
// Configuración de Supabase, constantes y autenticación
// ====================================

// Configuración de Supabase
const SUPABASE_URL = 'https://zmzdqfonlykuhjjovloa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptemRxZm9ubHlrdWhqam92bG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUwNTMsImV4cCI6MjA3MjMzMTA1M30.mqIhVKOK_6-XPu1o0oFW29wRMQieFp7eRg7shHnyv40';

// Inicializar cliente de Supabase
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================================
// CONFIGURACIÓN DE AUTENTICACIÓN
// ====================================

// Roles del sistema
const ROLES = {
    CAPTURISTA: 'capturista',
    SUBDIRECTOR: 'subdirector',
    ADMINISTRADOR: 'administrador',
    GENERAL: 'general'  // ← NUEVO ROL
};
// Configuración de sesión
const SESSION_CONFIG = {
    token_key: 'aifa_auth_token',
    user_key: 'aifa_user_data',
    expires_hours: 2,
    remember_me_days: 7
};
// Permisos por rol
const PERMISOS = {
    [ROLES.CAPTURISTA]: {
        puede_capturar: true,
        puede_ver_historico: false,
        puede_editar: false,
        puede_administrar_usuarios: false,
        anos_permitidos: [new Date().getFullYear()], // Solo año actual
        areas_permitidas: ['operaciones'] // Solo su área asignada
    },
    [ROLES.SUBDIRECTOR]: {
        puede_capturar: true,
        puede_ver_historico: true,
        puede_editar: true,
        puede_administrar_usuarios: false,
        anos_permitidos: 'todos', // Todos los años
        areas_permitidas: 'segun_asignacion' // Según su área asignada
    },
    [ROLES.ADMINISTRADOR]: {
        puede_capturar: true,
        puede_ver_historico: true,
        puede_editar: true,
        puede_administrar_usuarios: true,
        anos_permitidos: 'todos',
        areas_permitidas: 'todas'
    },
    [ROLES.GENERAL]: {
        puede_capturar: false,
        puede_ver_historico: true,
        puede_editar: false,
        puede_administrar_usuarios: false,
        anos_permitidos: 'todos',
        areas_permitidas: 'todas'
    }
};

// Áreas del sistema para subdirectores
const AREAS_SUBDIRECTOR = {
    'operaciones': {
        nombre: 'Operaciones',
        icono: '✈️',
        descripcion: 'Indicadores de aviación y operaciones aeroportuarias'
    },
    /*'mercadotecnia': {
        nombre: 'Mercadotecnia',
        icono: '📊',
        descripcion: 'Estrategias comerciales y promoción'
    },
    'gerencia_sms': {
        nombre: 'Gerencia de SMS',
        icono: '🛡️',
        descripcion: 'Sistema de Gestión de Seguridad'
    },
    'calidad': {
        nombre: 'Calidad',
        icono: '🏆',
        descripcion: 'Control y aseguramiento de calidad'
    },
    'recursos_humanos': {
        nombre: 'Recursos Humanos',
        icono: '👥',
        descripcion: 'Gestión del capital humano'
    },
    'comercial': {
        nombre: 'Comercial',
        icono: '💼',
        descripcion: 'Actividades comerciales y ventas'
    },
    'carga': {
        nombre: 'Carga',
        icono: '📦',
        descripcion: 'Operaciones de carga y logística'
    },
    'sistemas': {
        nombre: 'Sistemas',
        icono: '💻',
        descripcion: 'Tecnología e infraestructura'
    },*/
    // ← AGREGAR LAS 5 NUEVAS DIRECCIONES
    'direccion_operacion': {
        nombre: 'Dirección de Operación',
        icono: '🎯',
        descripcion: 'Gestión y control de operaciones aeroportuarias'
    },
    'direccion_planeacion': {
        nombre: 'Dirección de Planeación Estratégica',
        icono: '📋',
        descripcion: 'Planificación estratégica y desarrollo institucional'
    },
    'direccion_comercial': {
        nombre: 'Dirección Comercial y de Servicios',
        icono: '🏢',
        descripcion: 'Desarrollo comercial y servicios aeroportuarios'
    },
    'direccion_administracion': {
        nombre: 'Dirección de Administración',
        icono: '📊',
        descripcion: 'Gestión administrativa'
    },
    'direccion_juridica': {
        nombre: 'Dirección Jurídica',
        icono: '⚖️',
        descripcion: 'Asuntos legales y normativos'
    }
};

// Variable global de sesión
var currentUser = {
    id: null,
    username: null,
    email: null,
    rol: null,
    area: null,
    permisos: null,
    isAuthenticated: false
};
// ====================================
// CONSTANTES ORIGINALES DEL SISTEMA
// ====================================

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MESES_ABREV = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const AREAS = {
    'comercial': 'Aviación Comercial',
    'general': 'Aviación General',
    'carga': 'Aviación de Carga'
};

const INDICADORES = {
    'operaciones': 'Operaciones',
    'pasajeros': 'Pasajeros',
    'toneladas': 'Toneladas Transportadas'
};

// Opciones de comparación para visualización
const OPCIONES_COMPARACION = {
    'anterior': 'Mismo periodo año anterior',
    '2023': 'Mismo periodo 2023',
    '2022': 'Mismo periodo 2022'
};

// Escenarios de metas
const ESCENARIOS_META = {
    'bajo': 'Escenario Bajo',
    'mediano': 'Escenario Mediano',
    'alto': 'Escenario Alto'
};

// Descripción de escenarios
const DESCRIPCION_ESCENARIOS = {
    'bajo': 'Proyección conservadora con crecimiento mínimo esperado',
    'mediano': 'Proyección realista con crecimiento moderado esperado',
    'alto': 'Proyección optimista con crecimiento máximo esperado'
};

// Colores para las gráficas
const COLORES_GRAFICAS = [
    '#3B82F6', // Azul
    '#EF4444', // Rojo
    '#10B981', // Verde
    '#F59E0B', // Amarillo
    '#8B5CF6', // Púrpura
    '#F97316', // Naranja
    '#06B6D4', // Cian
    '#84CC16', // Lima
    '#EC4899', // Rosa
    '#6B7280'  // Gris
];

// Colores específicos para escenarios
const COLORES_ESCENARIOS = {
    'bajo': '#EF4444',      // Rojo para escenario bajo
    'mediano': '#F59E0B',   // Amarillo para escenario mediano
    'alto': '#10B981'       // Verde para escenario alto
};

// Configuración de años
const ANO_INICIAL = 2022;
const ANO_ACTUAL = new Date().getFullYear();

// Variables globales del estado de la aplicación
var currentChart = null;      // Gráfica del módulo de captura
var visualChart = null;       // Gráfica del módulo de visualización
var vContext = { 
    modo: null,              // 'pasajeros', 'operaciones', 'carga'
    currentData: null,       // Datos actuales cargados
    currentFilters: null     // Filtros aplicados
};

// Configuración de descarga de archivos
const DOWNLOAD_CONFIG = {
    filename: 'indicadores_aifa',
    dateFormat: 'YYYY-MM-DD',
    csvSeparator: ',',
    csvEncoding: 'utf-8-bom'
};

// Mensajes del sistema (actualizados)
const MENSAJES = {
    ERROR_CAMPOS_VACIOS: 'Por favor complete todos los campos obligatorios',
    ERROR_SELECCIONAR_TIPO: 'Por favor seleccione un tipo',
    ERROR_SELECCIONAR_ANO: 'Por favor seleccione un año',
    ERROR_SELECCIONAR_ESCENARIO: 'Por favor seleccione un escenario de meta',
    ERROR_CARGA_DATOS: 'Error al cargar los datos',
    ERROR_GUARDAR: 'Error al guardar',
    EXITO_GUARDAR: 'Datos guardados correctamente',
    EXITO_ACTUALIZAR: 'Datos actualizados correctamente',
    DATOS_SIN_CAMBIOS: 'Los datos no han cambiado',
    MODO_EDICION: 'Modo edición activado',
    OPERACION_CANCELADA: 'Operación cancelada por el usuario',
    CONFIRMACION_EDICION: 'Los datos han sido modificados correctamente',
    ERROR_RED: 'Error de conexión. Verifique su conexión a internet',
    SIN_DATOS: 'No se encontraron datos para los filtros seleccionados',
    SIN_DATOS_ESCENARIO: 'No se encontraron metas para el escenario seleccionado',
    DESCARGA_INICIADA: 'Iniciando descarga...',
    DESCARGA_ERROR: 'Error al descargar los datos',
    ESCENARIO_CAMBIADO: 'Escenario de meta actualizado',
    FILTROS_APLICADOS: 'Filtros aplicados correctamente',
    BIENVENIDO_GENERAL: 'Bienvenido al Panel de Control General',
    ACCESO_TOTAL_VISUALIZACION: 'Acceso completo en modo visualización',
    
    // Mensajes de autenticación
    ERROR_LOGIN: 'Usuario o contraseña incorrectos',
    ERROR_SESION_EXPIRADA: 'Su sesión ha expirado. Por favor inicie sesión nuevamente',
    ERROR_PERMISOS: 'No tiene permisos para acceder a esta función',
    ERROR_AREA_NO_AUTORIZADA: 'No tiene acceso a esta área',
    LOGIN_EXITOSO: 'Bienvenido al sistema',
    LOGOUT_EXITOSO: 'Sesión cerrada correctamente',
    ERROR_AUTENTICACION: 'Error en la autenticación'
};
// ====================================
// VALIDACIONES Y CONFIGURACIONES
// ====================================

// Validaciones
const VALIDACIONES = {
    VALOR_MINIMO: 0,
    VALOR_MAXIMO: 999999999,
    DECIMALES_PERMITIDOS: 2,
    ANO_MINIMO: ANO_INICIAL,
    ANO_MAXIMO: ANO_ACTUAL + 5,
    MES_MINIMO: 1,
    MES_MAXIMO: 12,
    
    // Validaciones de autenticación
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    PASSWORD_MIN_LENGTH: 6,
    EMAIL_PATTERN: /^[^\s@]+@aifa\.aero$/
};

// Configuración de formato de números
const FORMATO_NUMEROS = {
    locale: 'es-MX',
    options: {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }
};

// Configuración específica para cada tipo de indicador
const CONFIGURACION_INDICADORES = {
    'pasajeros': {
        unidad: 'pasajeros',
        formato: 'numero',
        decimales: 0,
        sufijo: '',
        color: '#3B82F6'
    },
    'operaciones': {
        unidad: 'operaciones',
        formato: 'numero',
        decimales: 0,
        sufijo: '',
        color: '#10B981'
    },
    'toneladas': {
        unidad: 'toneladas',
        formato: 'numero',
        decimales: 2,
        sufijo: ' t',
        color: '#F59E0B'
    }
};

const CONFIGURACION_GENERAL = {
    mostrar_comparacion_anual: true,
    anos_comparacion: [2024, 2025],
    mostrar_porcentaje_variacion: true,
    orden_elementos_vista: [
        'selector_tipo',
        'tabla_comparativa',
        'grafica',
        'selector_meta',
        'tabla_meta'
    ],
    areas_disponibles: ['pasajeros', 'operaciones', 'carga'],
    direcciones_en_construccion: [
        'dir_operacion',
        'dir_planeacion', 
        'dir_comercial',
        'dir_administracion',
        'dir_juridica'
    ]
};

// Configuración de tablas
const TABLA_CONFIG = {
    colores: {
        cumplimiento_alto: 'text-green-600 font-semibold',
        cumplimiento_mediano: 'text-yellow-600 font-medium',
        cumplimiento_bajo: 'text-red-600',
        variacion_positiva: 'text-green-600 font-medium',
        variacion_negativa: 'text-red-600',
        variacion_neutra: 'text-gray-600'
    },
    umbrales: {
        cumplimiento_alto: 100,
        cumplimiento_mediano: 80,
        variacion_significativa: 5
    }
};

// ====================================
// FUNCIONES DE UTILIDAD ACTUALIZADAS
// ====================================

// Funciones de utilidad para configuración
function obtenerConfiguracionIndicador(indicador) {
    return CONFIGURACION_INDICADORES[indicador] || CONFIGURACION_INDICADORES['operaciones'];
}

function obtenerColorEscenario(escenario) {
    return COLORES_ESCENARIOS[escenario] || COLORES_ESCENARIOS['mediano'];
}

function obtenerDescripcionEscenario(escenario) {
    return DESCRIPCION_ESCENARIOS[escenario] || '';
}

function esAnioValido(anio) {
    return anio >= VALIDACIONES.ANO_MINIMO && anio <= VALIDACIONES.ANO_MAXIMO;
}

function esMesValido(mes) {
    return mes >= VALIDACIONES.MES_MINIMO && mes <= VALIDACIONES.MES_MAXIMO;
}

function obtenerNombreIndicadorCompleto(indicador, area) {
    const nombres = {
        'pasajeros-comercial': 'Pasajeros de Aviación Comercial',
        'pasajeros-general': 'Pasajeros de Aviación General (FBO)',
        'operaciones-comercial': 'Operaciones de Aviación Comercial',
        'operaciones-general': 'Operaciones de Aviación General (FBO)',
        'operaciones-carga': 'Operaciones de Carga',
        'toneladas-carga': 'Toneladas Transportadas de Carga'
    };
    return nombres[`${indicador}-${area}`] || `${indicador} - ${area}`;
}

// ====================================
// FUNCIONES DE AUTENTICACIÓN
// ====================================

function verificarPermisos(accion) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    const permisos = currentUser.permisos;
    
    switch(accion) {
        case 'capturar':
            return permisos.puede_capturar;
        case 'ver_historico':
            return permisos.puede_ver_historico;
        case 'editar':
            return permisos.puede_editar;
        case 'administrar_usuarios':
            return permisos.puede_administrar_usuarios;
        default:
            return false;
    }
}

function puedeAccederArea(area) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    const areasPermitidas = currentUser.permisos.areas_permitidas;
    
    if (areasPermitidas === 'todas') {
        return true;
    }
    
    if (areasPermitidas === 'segun_asignacion') {
        return currentUser.area === area;
    }
    
    return Array.isArray(areasPermitidas) && areasPermitidas.includes(area);
}

function puedeAccederAnio(anio) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    const anosPermitidos = currentUser.permisos.anos_permitidos;
    
    if (anosPermitidos === 'todos') {
        return true;
    }
    
    return Array.isArray(anosPermitidos) && anosPermitidos.includes(anio);
}
function esRolGeneral() {
    return currentUser.isAuthenticated && currentUser.rol === ROLES.GENERAL;
}

function puedeAccederVistaGeneral(area) {
    if (!currentUser.isAuthenticated) {
        return false;
    }
    
    if (currentUser.rol === ROLES.GENERAL) {
        return true; // General tiene acceso a todas las vistas
    }
    
    return puedeAccederArea(area);
}

// Metadatos del sistema actualizados
const SISTEMA_INFO = {
    nombre: 'Sistema de Indicadores - Aeropuerto Internacional Felipe Ángeles',
    version: '0.6.1',
    autor: 'Planeación Estratégica AIFA',
    fecha_actualizacion: '2025-09-10',
    descripcion: 'Sistema para captura y visualización de indicadores operacionales del AIFA'
};
