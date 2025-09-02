// ====================================
// ARCHIVO 7: visualizacion.js (ACTUALIZADO)
// Lógica del módulo de visualización
// ====================================

/**
 * Variables del módulo de visualización
 */
let visualizacionData = {
    anioSeleccionado: obtenerAnioActual(),
    tipoSeleccionado: null,
    escenarioSeleccionado: 'mediano', // NUEVO
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
        llenarSelectorEscenario(); // NUEVO
        llenarSelectorComparacion();
        configurarEventosVisualizacion();
        
        // Limpiar datos anteriores
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
    // Botón aplicar filtros
    const btnAplicar = $('#btnAplicar');
    if (btnAplicar) {
        btnAplicar.onclick = aplicarFiltrosVisualizacion;
    }
    
    // Botón descargar
    const btnDescargar = $('#btnDescargar');
    if (btnDescargar) {
        btnDescargar.onclick = descargarInformacionVisualizacion;
    }
    
    // Eventos de cambio en selectores
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
    
    // NUEVO: Evento del selector de escenario
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
}

/**
 * Aplicar filtros y cargar datos de visualización
 */
async function aplicarFiltrosVisualizacion() {
    log('Aplicando filtros de visualización');
    
    // Validar filtros
    if (!validarFiltrosVisualizacion()) {
        return;
    }
    
    const anio = visualizacionData.anioSeleccionado;
    const tipo = visualizacionData.tipoSeleccionado;
    const escenario = visualizacionData.escenarioSeleccionado;
    const comparacion = visualizacionData.comparacionSeleccionada;
    
    try {
        // Mostrar estado de carga
        const btnAplicar = $('#btnAplicar');
        const textoOriginal = btnAplicar.innerHTML;
        mostrarCargando(btnAplicar, true);
        
        // Determinar área e indicador según el modo
        let area, indicador;
        if (vContext.modo === 'pasajeros') {
            area = tipo; // 'comercial' o 'general'
            indicador = 'pasajeros';
        } else if (vContext.modo === 'operaciones') {
            area = tipo; // 'comercial' o 'general'
            indicador = 'operaciones';
        } else { // carga
            area = 'carga';
            indicador = tipo; // 'operaciones' o 'toneladas'
        }
        
        log('Parámetros de consulta', { area, indicador, anio, escenario, comparacion });
        
        // Cargar datos de comparación
        await cargarDatosComparacion(area, indicador, anio, comparacion);
        
        // Crear tabla de comparación
        crearTablaComparacion();
        
        // Crear gráfica histórica
        await crearGraficaVisualizacion(area, indicador, tipo);
        
        log('Filtros aplicados correctamente');
        mostrarNotificacion('Datos cargados correctamente', 'success');
        
    } catch (error) {
        logError('Error al aplicar filtros', error);
        mostrarNotificacion('Error al cargar los datos', 'error');
    } finally {
        // Restaurar botón
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
    // Determinar año de comparación
    let anioComparacion;
    if (tipoComparacion === 'anterior') {
        anioComparacion = anioActual - 1;
    } else {
        anioComparacion = parseInt(tipoComparacion);
    }
    
    log('Cargando datos de comparación', { 
        anioActual, 
        anioComparacion, 
        area, 
        indicador 
    });
    
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
        if (area === 'comercial' && indicador === 'pasajeros' && anioActual === 2025) {
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
        
        // Guardar datos
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
 * Crear tabla de comparación simplificada
 */
function crearTablaComparacion() {
    const container = $('#tablaVisualizacion');
    if (!container) return;
    
    const datos = visualizacionData.datosComparacion;
    if (!datos.actuales) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay datos para mostrar</p>';
        return;
    }
    
    // Crear tabla
    const table = document.createElement('table');
    table.className = 'min-w-full border-collapse border border-gray-300';
    
    // Header simplificado
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th class="border border-gray-300 px-4 py-2">Mes</th>
        <th class="border border-gray-300 px-4 py-2">${datos.anioActual} - Meta (${visualizacionData.escenarioSeleccionado})</th>
        <th class="border border-gray-300 px-4 py-2">% Avance vs Meta</th>
        <th class="border border-gray-300 px-4 py-2">${datos.anioComparacion} - Referencia</th>
        <th class="border border-gray-300 px-4 py-2">Variación</th>
    `;
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    
    for (let mes = 1; mes <= 12; mes++) {
        const datosActualesMes = datos.actuales.find(d => d.mes === mes);
        const datosComparacionMes = datos.comparacion.find(d => d.mes === mes);
        
        const tr = document.createElement('tr');
        
        // Meta (actual o de escenarios según selección) - ACTUALIZADO
        let meta = datosActualesMes?.meta || '';
        if (datos.metasEscenarios.length > 0) {
            const metaEscenario = datos.metasEscenarios.find(m => m.mes === mes && m.escenario === visualizacionData.escenarioSeleccionado);
            if (metaEscenario) {
                meta = metaEscenario.meta;
                log(`Usando meta ${visualizacionData.escenarioSeleccionado} para ${MESES[mes-1]}: ${meta}`);
            }
        }
        
        // % Avance
        const valorActual = datosActualesMes?.valor || 0;
        let porcentajeAvance = '-';
        let claseAvance = '';
        
        if (meta && valorActual) {
            const avance = (valorActual / meta * 100).toFixed(1);
            porcentajeAvance = `${avance}%`;
            
            if (avance >= 100) {
                claseAvance = 'text-green-600 font-semibold';
            } else if (avance >= 80) {
                claseAvance = 'text-yellow-600 font-medium';
            } else {
                claseAvance = 'text-red-600';
            }
        }
        
        // Variación
        const valorComparacion = datosComparacionMes?.valor || 0;
        let variacion = '-';
        let claseVariacion = '';
        
        if (valorActual && valorComparacion) {
            const cambio = ((valorActual - valorComparacion) / valorComparacion * 100).toFixed(1);
            variacion = `${cambio > 0 ? '+' : ''}${cambio}%`;
            
            if (cambio > 0) {
                claseVariacion = 'text-green-600 font-medium';
            } else if (cambio < 0) {
                claseVariacion = 'text-red-600';
            } else {
                claseVariacion = 'text-gray-600';
            }
        }
        
        tr.innerHTML = `
            <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes-1]}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${meta ? formatearNumero(meta) : '-'}</td>
            <td class="border border-gray-300 px-4 py-2 text-right ${claseAvance}">${porcentajeAvance}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${valorComparacion ? formatearNumero(valorComparacion) : '-'}</td>
            <td class="border border-gray-300 px-4 py-2 text-right ${claseVariacion}">${variacion}</td>
        `;
        
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
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
        const textoOriginal = btnDescargar.innerHTML;
        mostrarCargando(btnDescargar, true);
        
        // Determinar área e indicador
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
        
        // Cargar TODOS los datos históricos para descarga
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
        
        // Formatear datos para exportación
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
        
        // Generar nombre de archivo
        const nombreArchivo = `indicadores_${area}_${indicador}_historico_completo`;
        
        // Descargar
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
    
    // Limpiar tabla
    const container = $('#tablaVisualizacion');
    if (container) {
        container.innerHTML = '';
    }
    
    // Limpiar gráfica
    if (visualChart) {
        visualChart.destroy();
        visualChart = null;
    }
}

function obtenerTituloDescarga() {
    if (!vContext.modo || !visualizacionData.tipoSeleccionado) {
        return 'indicadores_aviacion';
    }
    
    let titulo = 'indicadores';
    
    if (vContext.modo === 'pasajeros') {
        titulo += `_pasajeros_${visualizacionData.tipoSeleccionado}`;
    } else if (vContext.modo === 'operaciones') {
        titulo += `_operaciones_${visualizacionData.tipoSeleccionado}`;
    } else {
        titulo += `_carga_${visualizacionData.tipoSeleccionado}`;
    }
    
    titulo += `_${visualizacionData.anioSeleccionado}`;
    
    return titulo;
}

/**
 * Funciones de debug del módulo
 */
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
    
    if (visualizacionData.datosComparacion.metasEscenarios) {
        console.log('🎯 Metas escenarios:', visualizacionData.datosComparacion.metasEscenarios);
    }
    
    console.groupEnd();
}

/**
 * Validación específica de visualización
 */
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
