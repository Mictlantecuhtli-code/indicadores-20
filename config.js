// ====================================
// ARCHIVO 2: config.js (BIEN ARREGLADO)
// Configuración de Supabase y constantes
// ====================================

// Configuración de Supabase
const SUPABASE_URL = 'https://zmzdqfonlykuhjjovloa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptemRxZm9ubHlrdWhqam92bG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUwNTMsImV4cCI6MjA3MjMzMTA1M30.mqIhVKOK_6-XPu1o0oFW29wRMQieFp7eRg7shHnyv40';

// Inicializar cliente de Supabase
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constantes del sistema
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
    filename: 'indicadores_aviacion',
    dateFormat: 'YYYY-MM-DD',
    csvSeparator: ',',
    csvEncoding: 'utf-8-bom'
};

// Mensajes del sistema
const MENSAJES = {
    ERROR_CAMPOS_VACIOS: 'Por favor complete todos los campos obligatorios',
    ERROR_SELECCIONAR_TIPO: 'Por favor seleccione un tipo',
    ERROR_SELECCIONAR_ANO: 'Por favor seleccione un año',
    ERROR_SELECCIONAR_ESCENARIO: 'Por favor seleccione un escenario de meta',
    ERROR_CARGA_DATOS: 'Error al cargar los datos',
    ERROR_GUARDAR: 'Error al guardar',
    EXITO_GUARDAR: 'Datos guardados correctamente',
    ERROR_RED: 'Error de conexión. Verifique su conexión a internet',
    SIN_DATOS: 'No se encontraron datos para los filtros seleccionados',
    SIN_DATOS_ESCENARIO: 'No se encontraron metas para el escenario seleccionado',
    DESCARGA_INICIADA: 'Iniciando descarga...',
    DESCARGA_ERROR: 'Error al descargar los datos',
    ESCENARIO_CAMBIADO: 'Escenario de meta actualizado',
    FILTROS_APLICADOS: 'Filtros aplicados correctamente'
};

// Validaciones
const VALIDACIONES = {
    VALOR_MINIMO: 0,
    VALOR_MAXIMO: 999999999,
    DECIMALES_PERMITIDOS: 2,
    ANO_MINIMO: ANO_INICIAL,
    ANO_MAXIMO: ANO_ACTUAL + 5,
    MES_MINIMO: 1,
    MES_MAXIMO: 12
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

// Configuración de tablas
const TABLA_CONFIG = {
    colores: {
        cumplimiento_alto: 'text-green-600 font-semibold',
        cumplimiento_medio: 'text-yellow-600 font-medium',
        cumplimiento_bajo: 'text-red-600',
        variacion_positiva: 'text-green-600 font-medium',
        variacion_negativa: 'text-red-600',
        variacion_neutra: 'text-gray-600'
    },
    umbrales: {
        cumplimiento_alto: 100,
        cumplimiento_medio: 80,
        variacion_significativa: 5
    }
};

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

// Metadatos del sistema
const SISTEMA_INFO = {
    nombre: 'Sistema de Indicadores de Aviación',
    version: '2.0.0',
    autor: 'Equipo de Desarrollo',
    fecha_actualizacion: '2025-09-02',
    descripcion: 'Sistema para captura y visualización de indicadores de aviación comercial, general y de carga'
};
