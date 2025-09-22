// ====================================
// ARCHIVO 7: visualizacion.js (TABLA HORIZONTAL CORRECTA)
// Lógica del módulo de visualización
// ====================================

/**
 * Variables del módulo de visualización
 */
let visualizacionData = {
    anioSeleccionado: obtenerAnioActual(),
    tipoSeleccionado: null,
    escenarioSeleccionado: 'mediano',
    comparacionSeleccionada: 'anterior',
    datosComparacion: [],
    datosHistoricos: []
};

/**
 * Inicializar filtros de visualización
 */
function inicializarFiltrosVisualizacion() {
    log('Inicializando filtros de visualización', { modo: vContext.modo });
    
    try {
        llenarSelectorAnioVisualizacion();
        llenarSelectorTipoVisualizacion();
        llenarSelectorEscenario();
        llenarSelectorComparacion();
        configurarEventosVisualizacion();
        
        limpiarDatosVisualizacion();
        
        log('Filtros de visualización inicializados correctamente');
    } catch (error) {
        logError('Error al inicializar filtros de visualización', error);
        throw error;
    }
}

/**
 * Llenar selectores del módulo de visualización
 */
function llenarSelectorAnioVisualizacion() {
    const opcionesAnios = [];
    for (let anio = ANO_INICIAL; anio <= ANO_ACTUAL; anio++) {
        opcionesAnios.push({
            valor: anio,
            texto: anio.toString()
        });
    }
    
    llenarSelect('#vAnio', opcionesAnios, ANO_ACTUAL);
    visualizacionData.anioSeleccionado = ANO_ACTUAL;
}

function llenarSelectorTipoVisualizacion() {
    const tipoSelect = $('#vTipo');
    if (!tipoSelect) return;
    
    tipoSelect.innerHTML = '<option value="">Seleccionar...</option>';
    
    let opcionesTipo = [];
    
    if (vContext.modo === 'pasajeros' || vContext.modo === 'operaciones') {
        opcionesTipo = [
            { valor: 'comercial', texto: 'Comercial' },
            { valor: 'general', texto: 'General' }
        ];
    } else if (vContext.modo === 'carga') {
        opcionesTipo = [
            { valor: 'operaciones', texto: 'Operaciones' },
            { valor: 'toneladas', texto: 'Toneladas' }
        ];
    }
    
    opcionesTipo.forEach(opcion => {
        const option = document.createElement('option');
        option.value = opcion.valor;
        option.textContent = opcion.texto;
        tipoSelect.appendChild(option);
    });
}

function llenarSelectorEscenario() {
    const opcionesEscenario = [
        { valor: 'mediano', texto: 'Escenario Mediano' },
        { valor: 'bajo', texto: 'Escenario Bajo' },
        { valor: 'alto', texto: 'Escenario Alto' }
    ];
    
    llenarSelect('#vEscenario', opcionesEscenario, 'mediano');
    visualizacionData.escenarioSeleccionado = 'mediano';
}

function llenarSelectorComparacion() {
    const opcionesComparacion = [
        { valor: 'anterior', texto: 'Mismo periodo año anterior' },
        { valor: '2023', texto: 'Mismo periodo 2023' },
        { valor: '2022', texto: 'Mismo periodo 2022' }
    ];
    
    llenarSelect('#vComparar', opcionesComparacion, 'anterior');
    visualizacionData.comparacionSeleccionada = 'anterior';
}

/**
 * Configurar eventos del módulo de visualización
 */
function configurarEventosVisualizacion() {
    const btnAplicar = $('#btnAplicar');
    if (btnAplicar) {
        btnAplicar.onclick = aplicarFiltrosVisualizacion;
    }
    
    const btnDescargar = $('#btnDescargar');
    if (btnDescargar) {
        btnDescargar.onclick = descargarInformacionVisualizacion;
    }
    
    const anioSelect = $('#vAnio');
    if (anioSelect) {
        anioSelect.addEventListener('change', function() {
            visualizacionData.anioSeleccionado = parseInt(this.value);
        });
    }
    
    const tipoSelect = $('#vTipo');
    if (tipoSelect) {
        tipoSelect.addEventListener('change', function() {
            visualizacionData.tipoSeleccionado = this.value;
        });
    }
    
    const escenarioSelect = $('#vEscenario');
    if (escenarioSelect) {
        escenarioSelect.addEventListener('change', function() {
            visualizacionData.escenarioSeleccionado = this.value;
            log('Escenario cambiado a:', this.value);
        });
    }
    
    const comparacionSelect = $('#vComparar');
    if (comparacionSelect) {
        comparacionSelect.addEventListener('change', function() {
            visualizacionData.comparacionSeleccionada = this.value;
        });
    }

    // Evento del checkbox histórico - CORREGIDO
    const chkHistorico = $('#chkMostrarHistorico');
    if (chkHistorico) {
        chkHistorico.addEventListener('change', function() {
            if (visualizacionData.tipoSeleccionado) {
                // Re-crear gráfica cuando cambie el checkbox
                const area = vContext.modo === 'carga' ? 'carga' : visualizacionData.tipoSeleccionado;
                const indicador = vContext.modo === 'carga' ? visualizacionData.tipoSeleccionado : vContext.modo;
                crearGraficaComparativa(area, indicador, visualizacionData.tipoSeleccionado);
            }
        });
    }
}

/**
 * Aplicar filtros y cargar datos de visualización
 */
async function aplicarFiltrosVisualizacion() {
    log('Aplicando filtros de visualización');
    
    if (!validarFiltrosVisualizacion()) {
        return;
    }
    
    const anio = visualizacionData.anioSeleccionado;
    const tipo = visualizacionData.tipoSeleccionado;
    const escenario = visualizacionData.escenarioSeleccionado;
    const comparacion = visualizacionData.comparacionSeleccionada;
    
    try {
        const btnAplicar = $('#btnAplicar');
        mostrarCargando(btnAplicar, true);
        
        let area, indicador;
        if (vContext.modo === 'pasajeros') {
            area = tipo;
            indicador = 'pasajeros';
        } else if (vContext.modo === 'operaciones') {
            area = tipo;
            indicador = 'operaciones';
        } else {
            area = 'carga';
            indicador = tipo;
        }
        
        log('Parámetros de consulta', { area, indicador, anio, escenario, comparacion });
        
        await cargarDatosComparacion(area, indicador, anio, comparacion);
        crearTablaHorizontalCorrecta();
        await crearGraficaComparativa(area, indicador, tipo);
        
        log('Filtros aplicados correctamente');
        mostrarNotificacion('Datos cargados correctamente', 'success');
        
    } catch (error) {
        logError('Error al aplicar filtros', error);
        mostrarNotificacion('Error al cargar los datos', 'error');
    } finally {
        const btnAplicar = $('#btnAplicar');
        if (btnAplicar) {
            btnAplicar.disabled = false;
            btnAplicar.innerHTML = 'Aplicar Filtros';
        }
    }
}

/**
 * Cargar datos para comparación
 */
async function cargarDatosComparacion(area, indicador, anioActual, tipoComparacion) {
    let anioComparacion;
    if (tipoComparacion === 'anterior') {
        anioComparacion = anioActual - 1;
    } else {
        anioComparacion = parseInt(tipoComparacion);
    }
    
    log('Cargando datos de comparación', { anioActual, anioComparacion, area, indicador });
    
    try {
        // Cargar datos del año actual
        const { data: datosActuales, error: errorActuales } = await sb
            .from('v_medicion')
            .select('anio, mes, valor, meta, cumplimiento')
            .eq('area', area)
            .eq('indicador', indicador)
            .eq('anio', anioActual)
            .order('mes');
        
        if (errorActuales) {
            logError('Error cargando datos actuales', errorActuales);
            throw errorActuales;
        }
        
        // Cargar datos del año de comparación
        const { data: datosComparacion, error: errorComparacion } = await sb
            .from('v_medicion')
            .select('anio, mes, valor, meta, cumplimiento')
            .eq('area', area)
            .eq('indicador', indicador)
            .eq('anio', anioComparacion)
            .order('mes');
        
        if (errorComparacion) {
            log('Datos de comparación no encontrados (normal si no existen)', errorComparacion);
        }
        
        // Cargar metas de escenarios si es para pasajeros comerciales
        let metasEscenarios = [];
        //if (area === 'comercial' && indicador === 'pasajeros' && anioActual === 2025) {
        if (anioActual === 2025) {
            const { data: escenarios, error: errorEscenarios } = await sb
                .from('metas_escenarios')
                .select('mes, escenario, meta')
                .eq('area', area)
                .eq('indicador', indicador)
                .eq('anio', anioActual)
                .order('mes');
            
            if (!errorEscenarios && escenarios) {
                metasEscenarios = escenarios;
                log('Metas de escenarios cargadas', { cantidad: escenarios.length });
            }
        }
        
        visualizacionData.datosComparacion = {
            actuales: datosActuales || [],
            comparacion: datosComparacion || [],
            anioActual: anioActual,
            anioComparacion: anioComparacion,
            metasEscenarios: metasEscenarios
        };
        
        log('Datos de comparación cargados', {
            actuales: datosActuales?.length || 0,
            comparacion: datosComparacion?.length || 0,
            escenarios: metasEscenarios?.length || 0
        });
        
    } catch (error) {
        logError('Error en cargarDatosComparacion', error);
        throw error;
    }
}

/**
 * CREAR TABLA HORIZONTAL CORRECTA 
 */
function crearTablaHorizontalCorrecta() {

        const container = $('#tablaVisualizacion');
    if (!container) return;
    
    const datos = visualizacionData.datosComparacion;
    if (!datos.actuales) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay datos para mostrar</p>';
        return;
    }
    
    // CREAR LA TABLA EXACTAMENTE COMO LA QUIERES
    const table = document.createElement('table');
    table.className = 'min-w-full border-collapse border border-gray-300';
    
    const tbody = document.createElement('tbody');
    
    // FILA 1: HEADERS - |ENERO|FEBRERO|MARZO|...|DICIEMBRE|TOTAL ANUAL|VARIACIÓN %|
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th class="border border-gray-300 px-3 py-2 bg-gray-100 font-bold text-center w-20"></th>`;
    for (let mes = 1; mes <= 12; mes++) {
        headerRow.innerHTML += `<th class="border border-gray-300 px-2 py-2 bg-gray-100 text-center text-sm font-bold">${MESES[mes-1]}</th>`;
    }
    headerRow.innerHTML += `<th class="border border-gray-300 px-3 py-2 bg-gray-100 text-center font-bold">Total Anual</th>`;
    headerRow.innerHTML += `<th class="border border-gray-300 px-3 py-2 bg-gray-100 text-center font-bold">Variación %</th>`;
    tbody.appendChild(headerRow);
    
    // FILA 2: AÑO ACTUAL - 2025 | VALOR1 | VALOR2 |....| VALOR N| TOTAL | VARIACIÓN |
    const valorRow = document.createElement('tr');
    valorRow.innerHTML = `<td class="border border-gray-300 px-3 py-2 font-bold bg-blue-100 text-center">${datos.anioActual}</td>`;
    for (let mes = 1; mes <= 12; mes++) {
        const datoMes = datos.actuales.find(d => d.mes === mes);
        const valor = datoMes?.valor ? formatearNumero(datoMes.valor) : '-';
        valorRow.innerHTML += `<td class="border border-gray-300 px-2 py-2 text-center text-sm">${valor}</td>`;
    }
    // CALCULAR TOTAL ANUAL ACTUAL
    const totalActual = datos.actuales.reduce((sum, d) => sum + (d.valor || 0), 0);
    valorRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center font-bold">${formatearNumero(totalActual)}</td>`;
    valorRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center"></td>`; // Celda vacía para variación
    tbody.appendChild(valorRow);
    
    // FILA 3: META - META | VALORX | VALORY|.....|VALOR H| TOTAL META | VARIACIÓN META |
    const metaRow = document.createElement('tr');
    metaRow.innerHTML = `<td class="border border-gray-300 px-3 py-2 font-bold bg-yellow-100 text-center">META</td>`;
    for (let mes = 1; mes <= 12; mes++) {
        const datoMes = datos.actuales.find(d => d.mes === mes);
        let meta = datoMes?.meta || '';
        
        // USAR METAS DE ESCENARIOS SI ESTÁN DISPONIBLES
        if (datos.metasEscenarios.length > 0) {
            const metaEscenario = datos.metasEscenarios.find(m => m.mes === mes && m.escenario === visualizacionData.escenarioSeleccionado);
            if (metaEscenario) {
                meta = metaEscenario.meta;
            }
        }
        
        const metaFormateada = meta ? formatearNumero(meta) : '-';
        metaRow.innerHTML += `<td class="border border-gray-300 px-2 py-2 text-center text-sm bg-yellow-50">${metaFormateada}</td>`;
    }
    // CALCULAR TOTAL META ANUAL
    const totalMeta = datos.metasEscenarios.length > 0 
        ? datos.metasEscenarios.filter(m => m.escenario === visualizacionData.escenarioSeleccionado).reduce((sum, m) => sum + (m.meta || 0), 0)
        : datos.actuales.reduce((sum, d) => sum + (d.meta || 0), 0);
    metaRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center font-bold bg-yellow-50">${formatearNumero(totalMeta)}</td>`;
    metaRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center"></td>`; // Celda vacía para variación
    tbody.appendChild(metaRow);
    
    // FILA 4: %META - %META | PORCENTAJE | PORCENTAJE | ... | TOTAL %META | VARIACIÓN %META |
    const porcentajeRow = document.createElement('tr');
    porcentajeRow.innerHTML = `<td class="border border-gray-300 px-3 py-2 font-bold bg-green-100 text-center">%META</td>`;
    for (let mes = 1; mes <= 12; mes++) {
        const datoMes = datos.actuales.find(d => d.mes === mes);
        const valor = datoMes?.valor || 0;
        
        let meta = datoMes?.meta || 0;
        if (datos.metasEscenarios.length > 0) {
            const metaEscenario = datos.metasEscenarios.find(m => m.mes === mes && m.escenario === visualizacionData.escenarioSeleccionado);
            if (metaEscenario) {
                meta = metaEscenario.meta;
            }
        }
        
        let porcentaje = '-';
        let clase = 'bg-gray-50';
        
        if (meta && valor) {
            const avance = (valor / meta * 100).toFixed(1);
            porcentaje = `${avance}%`;
            
            if (avance >= 100) {
                clase = 'text-green-700 font-bold bg-green-100';
            } else if (avance >= 80) {
                clase = 'text-yellow-700 font-semibold bg-yellow-100';
            } else {
                clase = 'text-red-700 font-medium bg-red-100';
            }
        }
        
        porcentajeRow.innerHTML += `<td class="border border-gray-300 px-2 py-2 text-center text-sm ${clase}">${porcentaje}</td>`;
    }
    // CALCULAR %META TOTAL ANUAL
    let porcentajeTotalAnual = '-';
    let claseTotalAnual = 'bg-gray-50';
    if (totalMeta && totalActual) {
        const avanceTotal = (totalActual / totalMeta * 100).toFixed(1);
        porcentajeTotalAnual = `${avanceTotal}%`;
        
        if (avanceTotal >= 100) {
            claseTotalAnual = 'text-green-700 font-bold bg-green-100';
        } else if (avanceTotal >= 80) {
            claseTotalAnual = 'text-yellow-700 font-semibold bg-yellow-100';
        } else {
            claseTotalAnual = 'text-red-700 font-medium bg-red-100';
        }
    }
    porcentajeRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center font-bold ${claseTotalAnual}">${porcentajeTotalAnual}</td>`;
    porcentajeRow.innerHTML += `<td class="border border-gray-300 px-3 py-2 text-center"></td>`; // Celda vacía para variación
    tbody.appendChild(porcentajeRow);
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
    
    log('Tabla horizontal correcta creada');
}

/**
 * Descargar información de visualización
 */
async function descargarInformacionVisualizacion() {
    log('Iniciando descarga de información');
    
    if (!vContext.modo || !visualizacionData.tipoSeleccionado) {
        mostrarNotificacion('Por favor aplique los filtros antes de descargar', 'warning');
        return;
    }
    
    try {
        const btnDescargar = $('#btnDescargar');
        mostrarCargando(btnDescargar, true);
        
        let area, indicador;
        if (vContext.modo === 'pasajeros') {
            area = visualizacionData.tipoSeleccionado;
            indicador = 'pasajeros';
        } else if (vContext.modo === 'operaciones') {
            area = visualizacionData.tipoSeleccionado;
            indicador = 'operaciones';
        } else {
            area = 'carga';
            indicador = visualizacionData.tipoSeleccionado;
        }
        
        const { data: datosCompletos, error } = await sb
            .from('v_medicion')
            .select('*')
            .eq('area', area)
            .eq('indicador', indicador)
            .gte('anio', ANO_INICIAL)
            .order('anio')
            .order('mes');
        
        if (error) {
            logError('Error cargando datos completos', error);
            mostrarNotificacion('Error al cargar datos para descarga', 'error');
            return;
        }
        
        if (!datosCompletos || datosCompletos.length === 0) {
            mostrarNotificacion('No hay datos para descargar', 'warning');
            return;
        }
        
        const datosExportar = datosCompletos.map(d => ({
            Area: AREAS[d.area],
            Indicador: INDICADORES[d.indicador],
            Año: d.anio,
            Mes: MESES[d.mes - 1],
            Mes_Numero: d.mes,
            Valor: d.valor,
            Meta: d.meta,
            Porcentaje_Cumplimiento: d.cumplimiento,
            Fecha_Creacion: d.created_at,
            Creado_Por: d.created_by
        }));
        
        const nombreArchivo = `indicadores_${area}_${indicador}_historico_completo`;
        descargarCSV(datosExportar, nombreArchivo);
        
        log('Descarga completada', { registros: datosExportar.length });
        
    } catch (error) {
        logError('Error en descarga', error);
        mostrarNotificacion(MENSAJES.DESCARGA_ERROR, 'error');
    } finally {
        const btnDescargar = $('#btnDescargar');
        if (btnDescargar) {
            btnDescargar.disabled = false;
            btnDescargar.innerHTML = '📥 Descargar Información';
        }
    }
}

/**
 * Funciones auxiliares del módulo de visualización
 */
function limpiarDatosVisualizacion() {
    visualizacionData.datosComparacion = [];
    visualizacionData.datosHistoricos = [];
    
    const container = $('#tablaVisualizacion');
    if (container) {
        container.innerHTML = '';
    }
    
    if (visualChart) {
        visualChart.destroy();
        visualChart = null;
    }
}

function debugVisualizacion() {
    console.group('📊 DEBUG MÓDULO VISUALIZACIÓN');
    console.table({
        'Modo': vContext.modo || 'N/A',
        'Año Seleccionado': visualizacionData.anioSeleccionado,
        'Tipo Seleccionado': visualizacionData.tipoSeleccionado || 'N/A',
        'Escenario Seleccionado': visualizacionData.escenarioSeleccionado || 'N/A',
        'Comparación': OPCIONES_COMPARACION[visualizacionData.comparacionSeleccionada] || 'N/A'
    });
    
    if (visualizacionData.datosComparacion.actuales) {
        console.log('📈 Datos actuales:', visualizacionData.datosComparacion.actuales);
    }
    
    if (visualizacionData.datosComparacion.comparacion) {
        console.log('📉 Datos comparación:', visualizacionData.datosComparacion.comparacion);
    }
    
    console.groupEnd();
}

function validarEstadoVisualizacion() {
    if (!vContext.modo) {
        logError('Modo de visualización no definido');
        return false;
    }
    
    if (!visualizacionData.anioSeleccionado) {
        logError('Año no seleccionado');
        return false;
    }
    
    if (!visualizacionData.tipoSeleccionado) {
        logError('Tipo no seleccionado');
        return false;
    }
    
    return true;
}

// Exponer funciones necesarias globalmente
window.aplicarFiltrosVisualizacion = aplicarFiltrosVisualizacion;
window.descargarInformacionVisualizacion = descargarInformacionVisualizacion;
window.inicializarFiltrosVisualizacion = inicializarFiltrosVisualizacion;

log('Módulo de visualización cargado');
