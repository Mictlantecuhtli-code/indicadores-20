// ====================================
// ARCHIVO 6: captura.js
// Lógica del módulo de captura
// ====================================

/**
 * Variables del módulo de captura
 */
let capturaData = {
    currentYear: obtenerAnioActual(),
    currentMonth: obtenerMesActual(),
    selectedArea: null,
    selectedIndicador: null,
    datosActuales: []
};

/**
 * Inicializar módulo de captura
 */
function inicializarModuloCaptura() {
    log('Inicializando módulo de captura');
    
    try {
        llenarSelectoresCaptura();
        configurarEventosCaptura();
        limpiarFormularioCaptura();
        
        log('Módulo de captura inicializado correctamente');
    } catch (error) {
        logError('Error al inicializar módulo de captura', error);
        throw error;
    }
}

/**
 * Llenar selectores del módulo de captura
 */
function llenarSelectoresCaptura() {
    // Llenar selector de años
    llenarSelectorAnios();
    
    // Llenar selector de meses
    llenarSelectorMeses();
    
    // Llenar selector de áreas
    llenarSelectorAreas();
    
    // El selector de indicadores se llena dinámicamente al seleccionar área
}

function llenarSelectorAnios() {
    const opcionesAnios = [];
    for (let anio = ANO_INICIAL; anio <= ANO_ACTUAL; anio++) {
        opcionesAnios.push({
            valor: anio,
            texto: anio.toString()
        });
    }
    
    llenarSelect('#fAnio', opcionesAnios, ANO_ACTUAL);
    capturaData.currentYear = ANO_ACTUAL;
}

function llenarSelectorMeses() {
    const opcionesMeses = MESES.map((mes, index) => ({
        valor: index + 1,
        texto: mes
    }));
    
    llenarSelect('#fMes', opcionesMeses, capturaData.currentMonth);
}

function llenarSelectorAreas() {
    const opcionesAreas = [
        { valor: '', texto: 'Seleccionar...' },
        ...Object.entries(AREAS).map(([clave, nombre]) => ({
            valor: clave,
            texto: nombre
        }))
    ];
    
    llenarSelect('#fArea', opcionesAreas);
}

function llenarSelectorIndicadores(area) {
    const indicadorSelect = $('#fIndicador');
    if (!indicadorSelect) return;
    
    indicadorSelect.innerHTML = '<option value="">Seleccionar...</option>';
    
    let indicadoresDisponibles = [];
    
    if (area === 'comercial' || area === 'general') {
        indicadoresDisponibles = ['operaciones', 'pasajeros'];
    } else if (area === 'carga') {
        indicadoresDisponibles = ['operaciones', 'toneladas'];
    }
    
    indicadoresDisponibles.forEach(indicador => {
        const option = document.createElement('option');
        option.value = indicador;
        option.textContent = INDICADORES[indicador];
        indicadorSelect.appendChild(option);
    });
}

/**
 * Configurar eventos del módulo de captura
 */
function configurarEventosCaptura() {
    // Evento para cambio de área
    const areaSelect = $('#fArea');
    if (areaSelect) {
        areaSelect.addEventListener('change', manejarCambioArea);
    }
    
    // Evento para cambio de indicador
    const indicadorSelect = $('#fIndicador');
    if (indicadorSelect) {
        indicadorSelect.addEventListener('change', manejarCambioIndicador);
    }
    
    // Evento para cambio de año
    const anioSelect = $('#fAnio');
    if (anioSelect) {
        anioSelect.addEventListener('change', manejarCambioAnio);
    }
    
    // Validación de entrada en campos numéricos
    const valorInput = $('#fValor');
    if (valorInput) {
        valorInput.addEventListener('input', validarEntradaNumerica);
        valorInput.addEventListener('blur', formatearEntradaNumerica);
    }
    
    const metaInput = $('#fMeta');
    if (metaInput) {
        metaInput.addEventListener('input', validarEntradaNumerica);
        metaInput.addEventListener('blur', formatearEntradaNumerica);
    }
}

/**
 * Manejadores de eventos
 */
function manejarCambioArea() {
    const area = $('#fArea').value;
    capturaData.selectedArea = area;
    
    log('Cambio de área', { area });
    
    // Limpiar selector de indicadores
    llenarSelectorIndicadores(area);
    
    // Limpiar datos actuales
    limpiarDatosCaptura();
    
    if (area) {
        // Pre-cargar datos si ya hay indicador seleccionado
        const indicador = $('#fIndicador').value;
        if (indicador) {
            cargarDatosCaptura();
        }
    }
}

function manejarCambioIndicador() {
    const indicador = $('#fIndicador').value;
    capturaData.selectedIndicador = indicador;
    
    log('Cambio de indicador', { indicador });
    
    if (indicador && capturaData.selectedArea) {
        cargarDatosCaptura();
    } else {
        limpiarDatosCaptura();
    }
}

function manejarCambioAnio() {
    const anio = parseInt($('#fAnio').value);
    capturaData.currentYear = anio;
    
    log('Cambio de año', { anio });
    
    if (capturaData.selectedArea && capturaData.selectedIndicador) {
        cargarDatosCaptura();
    }
}

function validarEntradaNumerica(event) {
    const input = event.target;
    const valor = input.value;
    
    // Permitir solo números, punto decimal y signo negativo
    const patron = /^-?\d*\.?\d*$/;
    
    if (!patron.test(valor)) {
        // Remover caracteres inválidos
        input.value = valor.replace(/[^-\d.]/g, '');
    }
    
    // Validar rango
    const numeroValor = parseFloat(input.value);
    if (!isNaN(numeroValor)) {
        if (numeroValor < VALIDACIONES.VALOR_MINIMO || numeroValor > VALIDACIONES.VALOR_MAXIMO) {
            input.classList.add('border-red-500');
        } else {
            input.classList.remove('border-red-500');
        }
    }
}

function formatearEntradaNumerica(event) {
    const input = event.target;
    const valor = parseFloat(input.value);
    
    if (!isNaN(valor)) {
        input.value = valor.toFixed(VALIDACIONES.DECIMALES_PERMITIDOS);
    }
}

/**
 * Cargar datos del módulo de captura
 */
async function cargarDatosCaptura() {
    const area = capturaData.selectedArea;
    const indicador = capturaData.selectedIndicador;
    const anio = capturaData.currentYear;
    
    if (!area || !indicador || !anio) {
        log('Datos insuficientes para cargar', { area, indicador, anio });
        return;
    }
    
    try {
        log('Cargando datos de captura', { area, indicador, anio });
        
        // Mostrar estado de carga
        const botonAplicar = $('#btnAplicar');
        mostrarCargando(botonAplicar, true);
        
        // Cargar datos desde la base de datos
        const { data, error } = await sb
            .from('v_medicion')
            .select('*')
            .eq('area', area)
            .eq('indicador', indicador)
            .eq('anio', anio)
            .order('mes');
        
        if (error) {
            logError('Error cargando datos de captura', error);
            mostrarNotificacion(MENSAJES.ERROR_CARGA_DATOS, 'error');
            return;
        }
        
        // Guardar datos actuales
        capturaData.datosActuales = data;
        
        // Actualizar tabla
        actualizarTablaCaptura(data);
        
        // Crear gráfica
        await crearGraficaCaptura(area, indicador);
        
        log('Datos de captura cargados correctamente', { registros: data.length });
        
    } catch (error) {
        logError('Error en cargarDatosCaptura', error);
        mostrarNotificacion('Error al cargar los datos', 'error');
    } finally {
        // Ocultar estado de carga
        const botonAplicar = $('#btnAplicar');
        mostrarCargando(botonAplicar, false);
    }
}

/**
 * Actualizar tabla de captura
 */
function actualizarTablaCaptura(datos) {
    const tbody = $('#tbodyCaptura');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Crear filas para todos los meses
    for (let mes = 1; mes <= 12; mes++) {
        const datoMes = datos.find(d => d.mes === mes) || {};
        const tr = document.createElement('tr');
        
        // Determinar clase de cumplimiento
        let cumplimientoTexto = '-';
        let cumplimientoClase = '';
        
        if (datoMes.cumplimiento !== null && datoMes.cumplimiento !== undefined) {
            cumplimientoTexto = formatearPorcentaje(datoMes.cumplimiento);
            
            if (datoMes.cumplimiento >= 100) {
                cumplimientoClase = 'text-green-600 font-semibold';
            } else if (datoMes.cumplimiento >= 80) {
                cumplimientoClase = 'text-yellow-600 font-medium';
            } else {
                cumplimientoClase = 'text-red-600';
            }
        }
        
        // Formatear valores
        const valorFormateado = datoMes.valor ? formatearNumero(datoMes.valor) : '';
        const metaFormateada = datoMes.meta ? formatearNumero(datoMes.meta) : '';
        
        tr.innerHTML = `
            <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes-1]}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${valorFormateado}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${metaFormateada}</td>
            <td class="border border-gray-300 px-4 py-2 text-right ${cumplimientoClase}">${cumplimientoTexto}</td>
        `;
        
        // Destacar mes actual
        if (mes === capturaData.currentMonth && capturaData.currentYear === ANO_ACTUAL) {
            tr.classList.add('bg-blue-50');
        }
        
        tbody.appendChild(tr);
    }
}

/**
 * Guardar medición
 */
async function guardarMedicion() {
    log('Iniciando proceso de guardado de medición');
    
    // Validar formulario
    if (!validarFormularioCaptura()) {
        return;
    }
    
    // Obtener datos del formulario
    const area = $('#fArea').value;
    const indicador = $('#fIndicador').value;
    const anio = parseInt($('#fAnio').value);
    const mes = parseInt($('#fMes').value);
    const valor = limpiarNumero($('#fValor').value) || 0;
    const meta = limpiarNumero($('#fMeta').value) || 0;
    
    const datosGuardar = {
        area,
        indicador,
        anio,
        mes,
        valor,
        meta
    };
    
    log('Datos a guardar', datosGuardar);
    
    try {
        // Mostrar estado de carga en el botón
        const botonGuardar = $('button[onclick="guardarMedicion()"]');
        const textoOriginal = botonGuardar?.innerHTML || 'Guardar';
        mostrarCargando(botonGuardar, true);
        
        // Guardar en la base de datos usando upsert
        const { data, error } = await sb
            .from('medicion')
            .upsert(datosGuardar, {
                onConflict: 'area,indicador,anio,mes'
            });
        
        if (error) {
            logError('Error al guardar medición', error);
            mostrarNotificacion(`${MENSAJES.ERROR_GUARDAR}: ${error.message}`, 'error');
            return;
        }
        
        // Éxito
        log('Medición guardada correctamente', data);
        mostrarNotificacion(MENSAJES.EXITO_GUARDAR, 'success');
        
        // Limpiar campos de entrada
        limpiarCamposEntrada();
        
        // Recargar datos para reflejar los cambios
        await cargarDatosCaptura();
        
    } catch (error) {
        logError('Error en guardarMedicion', error);
        mostrarNotificacion('Error inesperado al guardar', 'error');
    } finally {
        // Restaurar botón
        const botonGuardar = $('button[onclick="guardarMedicion()"]');
        if (botonGuardar) {
            botonGuardar.disabled = false;
            botonGuardar.innerHTML = 'Guardar';
        }
    }
}

/**
 * Funciones auxiliares del módulo de captura
 */
function limpiarFormularioCaptura() {
    // Limpiar selectores (excepto año y mes que tienen valores por defecto)
    const areaSelect = $('#fArea');
    if (areaSelect) areaSelect.value = '';
    
    const indicadorSelect = $('#fIndicador');
    if (indicadorSelect) indicadorSelect.innerHTML = '<option value="">Seleccionar...</option>';
    
    limpiarCamposEntrada();
    limpiarDatosCaptura();
}

function limpiarCamposEntrada() {
    const valorInput = $('#fValor');
    if (valorInput) {
        valorInput.value = '';
        valorInput.classList.remove('border-red-500');
    }
    
    const metaInput = $('#fMeta');
    if (metaInput) {
        metaInput.value = '';
        metaInput.classList.remove('border-red-500');
    }
}

function limpiarDatosCaptura() {
    capturaData.datosActuales = [];
    
    // Limpiar tabla
    const tbody = $('#tbodyCaptura');
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    // Limpiar gráfica
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

/**
 * Funciones de carga de datos inicial
 */
function cargarDatosMesPorDefecto() {
    if (!capturaData.selectedArea || !capturaData.selectedIndicador) return;
    
    const datoMesActual = capturaData.datosActuales.find(
        d => d.mes === capturaData.currentMonth
    );
    
    if (datoMesActual) {
        const valorInput = $('#fValor');
        const metaInput = $('#fMeta');
        
        if (valorInput) valorInput.value = datoMesActual.valor || '';
        if (metaInput) metaInput.value = datoMesActual.meta || '';
    }
}

/**
 * Funciones de exportación específicas del módulo
 */
function exportarDatosCaptura() {
    if (!capturaData.datosActuales || capturaData.datosActuales.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'warning');
        return;
    }
    
    const datosExportar = capturaData.datosActuales.map(d => ({
        Area: AREAS[d.area],
        Indicador: INDICADORES[d.indicador],
        Año: d.anio,
        Mes: MESES[d.mes - 1],
        Valor: d.valor,
        Meta: d.meta,
        'Porcentaje_Cumplimiento': d.cumplimiento
    }));
    
    const nombreArchivo = `captura_${capturaData.selectedArea}_${capturaData.selectedIndicador}_${capturaData.currentYear}`;
    descargarCSV(datosExportar, nombreArchivo);
}

/**
 * Funciones de debug específicas del módulo
 */
function debugCaptura() {
    console.group('🔧 DEBUG MÓDULO CAPTURA');
    console.table({
        'Área Seleccionada': capturaData.selectedArea || 'N/A',
        'Indicador Seleccionado': capturaData.selectedIndicador || 'N/A',
        'Año Actual': capturaData.currentYear,
        'Mes Actual': MESES[capturaData.currentMonth - 1],
        'Registros Cargados': capturaData.datosActuales.length
    });
    
    if (capturaData.datosActuales.length > 0) {
        console.log('📊 Datos actuales:', capturaData.datosActuales);
    }
    
    console.groupEnd();
}

// Exponer función global para el botón guardar
window.guardarMedicion = guardarMedicion;

// Funciones de inicialización para uso interno
window.inicializarModuloCaptura = inicializarModuloCaptura;
