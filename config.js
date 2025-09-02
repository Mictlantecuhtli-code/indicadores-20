// ====================================
// ARCHIVO 2: config.js
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

// Configuración de años
const ANO_INICIAL = 2022;
const ANO_ACTUAL = new Date().getFullYear();

// Variables globales del estado de la aplicación
let currentChart = null;      // Gráfica del módulo de captura
let visualChart = null;       // Gráfica del módulo de visualización
let vContext = { 
    modo: null,              // 'pasajeros', 'operaciones', 'carga'
    currentData: null,       // Datos actuales cargados
    currentFilters: null     // Filtros aplicados
};

// Configuración de Chart.js por defecto
Chart.defaults.font.family = "'Inter', 'system-ui', 'sans-serif'";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#374151';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 15;
Chart.defaults.elements.point.radius = 4;
Chart.defaults.elements.point.hoverRadius = 6;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.line.tension = 0.1;

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
    ERROR_CARGA_DATOS: 'Error al cargar los datos',
    ERROR_GUARDAR: 'Error al guardar',
    EXITO_GUARDAR: 'Datos guardados correctamente',
    ERROR_RED: 'Error de conexión. Verifique su conexión a internet',
    SIN_DATOS: 'No se encontraron datos para los filtros seleccionados',
    DESCARGA_INICIADA: 'Iniciando descarga...',
    DESCARGA_ERROR: 'Error al descargar los datos'
};

// Validaciones
const VALIDACIONES = {
    VALOR_MINIMO: 0,
    VALOR_MAXIMO: 999999999,
    DECIMALES_PERMITIDOS: 2
};

// Configuración de formato de números
const FORMATO_NUMEROS = {
    locale: 'es-MX',
    options: {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }
};

// Exportar configuración si se necesita en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sb,
        MESES,
        AREAS,
        INDICADORES,
        OPCIONES_COMPARACION,
        COLORES_GRAFICAS,
        ANO_INICIAL,
        ANO_ACTUAL,
        vContext,
        MENSAJES,
        VALIDACIONES,
        FORMATO_NUMEROS
    };
}
