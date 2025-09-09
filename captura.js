// ====================================
// ARCHIVO: captura.js
// Módulo de Captura (endurecido: solo mes vigente del año actual)
// ====================================

/**
 * Estado del módulo de captura
 */
let capturaData = {
  currentYear: typeof obtenerAnioActual === 'function' ? obtenerAnioActual() : (typeof ANO_ACTUAL !== 'undefined' ? ANO_ACTUAL : new Date().getFullYear()),
  currentMonth: typeof obtenerMesActual === 'function' ? obtenerMesActual() : (new Date().getMonth() + 1),
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

    // Estado inicial del botón Guardar
    actualizarEstadoBotonGuardar();

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
  // Año (restringido al actual)
  llenarSelectorAnios();

  // Mes (bloqueado al vigente para capturista)
  llenarSelectorMeses();

  // Áreas
  llenarSelectorAreas();

  // Indicadores se llenan al seleccionar área
}

/**
 * AÑO: solo el actual (siempre), deshabilitado para capturista
 */
function llenarSelectorAnios() {
  const opcionesAnios = [{
    valor: ANO_ACTUAL,
    texto: ANO_ACTUAL.toString()
  }];

  llenarSelect('#fAnio', opcionesAnios, ANO_ACTUAL);
  capturaData.currentYear = ANO_ACTUAL;

  const anioSel = $('#fAnio');
  if (anioSel && currentUser?.rol === ROLES.CAPTURISTA) {
    anioSel.disabled = true;
    anioSel.classList.add('disabled-by-role');
  }
}

/**
 * MES: lista 1–12 pero fuerza y bloquea el vigente para capturista
 */
function llenarSelectorMeses() {
  const opcionesMeses = MESES.map((mes, index) => ({
    valor: index + 1,
    texto: mes
  }));

  llenarSelect('#fMes', opcionesMeses, capturaData.currentMonth);

  const mesSel = $('#fMes');
  if (mesSel && currentUser?.rol === ROLES.CAPTURISTA) {
    mesSel.value = capturaData.currentMonth;
    mesSel.disabled = true;
    mesSel.classList.add('disabled-by-role');
  }
}

/**
 * ÁREAS: según catálogo global AREAS; capturista sólo su área
 */
function llenarSelectorAreas() {
  let opcionesAreas = [
    { valor: '', texto: 'Seleccionar...' },
    ...Object.entries(AREAS).map(([clave, nombre]) => ({
      valor: clave,
      texto: nombre
    }))
  ];

  // Endurecer para capturista: solo su área
  if (currentUser?.rol === ROLES.CAPTURISTA && currentUser.area) {
    opcionesAreas = [
      { valor: '', texto: 'Seleccionar...' },
      { valor: currentUser.area, texto: AREAS[currentUser.area] || currentUser.area }
    ];
  }

  llenarSelect('#fArea', opcionesAreas);

  // Si capturista, fijar y guardar selectedArea
  const areaSel = $('#fArea');
  if (areaSel && currentUser?.rol === ROLES.CAPTURISTA && currentUser.area) {
    areaSel.value = currentUser.area;
    capturaData.selectedArea = currentUser.area;
    // Prellenar indicadores de su área
    llenarSelectorIndicadores(currentUser.area);
  }
}

/**
 * INDICADORES: por área
 */
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
 * Eventos del módulo
 */
function configurarEventosCaptura() {
  const areaSelect = $('#fArea');
  if (areaSelect) areaSelect.addEventListener('change', manejarCambioArea);

  const indicadorSelect = $('#fIndicador');
  if (indicadorSelect) indicadorSelect.addEventListener('change', manejarCambioIndicador);

  const anioSelect = $('#fAnio');
  if (anioSelect) anioSelect.addEventListener('change', manejarCambioAnio);

  const mesSelect = $('#fMes');
  if (mesSelect) mesSelect.addEventListener('change', () => {
    // En teoría solo admins/subdirectores podrían moverlo
    capturaData.currentMonth = parseInt($('#fMes').value);
    actualizarEstadoBotonGuardar();
  });

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
 * Handlers
 */
function manejarCambioArea() {
  let area = $('#fArea').value;

  // Capturista: forzar su área
  if (currentUser?.rol === ROLES.CAPTURISTA && currentUser.area) {
    area = currentUser.area;
    $('#fArea').value = currentUser.area;
  }

  capturaData.selectedArea = area;
  log('Cambio de área', { area });

  llenarSelectorIndicadores(area);
  limpiarDatosCaptura();

  const indicador = $('#fIndicador').value;
  if (area && indicador) {
    cargarDatosCaptura();
  }

  actualizarEstadoBotonGuardar();
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

  actualizarEstadoBotonGuardar();
}

function manejarCambioAnio() {
  // Forzar año actual siempre en estado interno
  const anio = ANO_ACTUAL;
  if ($('#fAnio')) $('#fAnio').value = ANO_ACTUAL;

  capturaData.currentYear = anio;
  log('Cambio de año (forzado a actual)', { anio });

  if (capturaData.selectedArea && capturaData.selectedIndicador) {
    cargarDatosCaptura();
  }

  actualizarEstadoBotonGuardar();
}

/**
 * Validaciones de entrada
 */
function validarEntradaNumerica(event) {
  const input = event.target;
  const valor = input.value;

  const patron = /^-?\d*\.?\d*$/;
  if (!patron.test(valor)) {
    input.value = valor.replace(/[^-\d.]/g, '');
  }

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
 * Cargar datos (endurecido para capturista: año actual y su área)
 */
async function cargarDatosCaptura() {
  let area = capturaData.selectedArea;
  let indicador = capturaData.selectedIndicador;
  let anio = capturaData.currentYear;

  if (!area || !indicador || !anio) {
    log('Datos insuficientes para cargar', { area, indicador, anio });
    return;
  }

  // Hardening: capturista => año actual y su área
  if (currentUser?.rol === ROLES.CAPTURISTA) {
    anio = ANO_ACTUAL;
    if (currentUser.area) area = currentUser.area;

    // Sincronizar UI por si manipularon el DOM
    const anioSel = $('#fAnio'); if (anioSel) anioSel.value = ANO_ACTUAL;
    const areaSel = $('#fArea'); if (areaSel && areaSel.value !== area) areaSel.value = area;
  }

  try {
    log('Cargando datos de captura', { area, indicador, anio });

    const botonAplicar = $('#btnAplicar');
    mostrarCargando(botonAplicar, true);

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

    capturaData.datosActuales = data;

    actualizarTablaCaptura(data);
    await crearGraficaCaptura(area, indicador);

    log('Datos de captura cargados correctamente', { registros: data.length });
  } catch (error) {
    logError('Error en cargarDatosCaptura', error);
    mostrarNotificacion('Error al cargar los datos', 'error');
  } finally {
    const botonAplicar = $('#btnAplicar');
    mostrarCargando(botonAplicar, false);
    actualizarEstadoBotonGuardar();
  }
}

/**
 * Tabla
 */
function actualizarTablaCaptura(datos) {
  const tbody = $('#tbodyCaptura');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (let mes = 1; mes <= 12; mes++) {
    const datoMes = datos.find(d => d.mes === mes) || {};
    const tr = document.createElement('tr');

    // Cumplimiento
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

    // Formatos
    const valorFormateado = (datoMes.valor || datoMes.valor === 0) ? formatearNumero(datoMes.valor) : '';
    const metaFormateada = (datoMes.meta  || datoMes.meta === 0)  ? formatearNumero(datoMes.meta)  : '';

    tr.innerHTML = `
      <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes - 1]}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${valorFormateado}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${metaFormateada}</td>
      <td class="border border-gray-300 px-4 py-2 text-right ${cumplimientoClase}">${cumplimientoTexto}</td>
    `;

    // Destacar mes vigente del año actual
    if (mes === capturaData.currentMonth && capturaData.currentYear === ANO_ACTUAL) {
      tr.classList.add('bg-blue-50');
    }

    tbody.appendChild(tr);
  }
}

/**
 * VALIDACIÓN FUERTE del formulario de captura
 * - Solo año actual
 * - Solo mes vigente
 * - Capturista: solo su área
 */
function validarFormularioCaptura() {
  const area = $('#fArea')?.value;
  const indicador = $('#fIndicador')?.value;
  const anio = parseInt($('#fAnio')?.value);
  const mes = parseInt($('#fMes')?.value);

  if (!area || !indicador || !anio || !mes) {
    mostrarNotificacion('Seleccione área, indicador, año y mes', 'error');
    return false;
  }

  if (anio !== ANO_ACTUAL) {
    mostrarNotificacion(`Solo puede capturarse el año ${ANO_ACTUAL}`, 'error');
    return false;
  }

  if (mes !== capturaData.currentMonth) {
    const mesTxt = MESES[capturaData.currentMonth - 1];
    mostrarNotificacion(`Solo puede capturarse el mes vigente (${mesTxt})`, 'error');
    return false;
  }

  if (currentUser?.rol === ROLES.CAPTURISTA) {
    if (currentUser.area && area !== currentUser.area) {
      mostrarNotificacion('No está autorizado para capturar en esta área', 'error');
      return false;
    }
  }

  // Validar valores numéricos
  const valor = limpiarNumero($('#fValor')?.value) ?? null;
  const meta = limpiarNumero($('#fMeta')?.value) ?? null;

  if (valor === null || isNaN(valor)) {
    mostrarNotificacion('Ingrese un valor numérico válido', 'error');
    return false;
  }
  if (meta === null || isNaN(meta)) {
    mostrarNotificacion('Ingrese una meta numérica válida', 'error');
    return false;
  }

  if (valor < VALIDACIONES.VALOR_MINIMO || valor > VALIDACIONES.VALOR_MAXIMO) {
    mostrarNotificacion('El valor está fuera de rango permitido', 'error');
    return false;
  }
  if (meta < VALIDACIONES.VALOR_MINIMO || meta > VALIDACIONES.VALOR_MAXIMO) {
    mostrarNotificacion('La meta está fuera de rango permitido', 'error');
    return false;
  }

  return true;
}

/**
 * Guardar medición (upsert) con validación de permisos
 */
async function guardarMedicion() {
  log('Iniciando proceso de guardado de medición');

  // Validación UI
  if (!validarFormularioCaptura()) {
    actualizarEstadoBotonGuardar();
    return;
  }

  // Datos del formulario (forzando reglas)
  let area = $('#fArea').value;
  const indicador = $('#fIndicador').value;
  const anio = ANO_ACTUAL; // SIEMPRE año actual
  const mes = capturaData.currentMonth; // SIEMPRE mes vigente
  let valor = limpiarNumero($('#fValor').value) || 0;
  let meta = limpiarNumero($('#fMeta').value) || 0;

  // Capturista: forzar área del usuario
  if (currentUser?.rol === ROLES.CAPTURISTA && currentUser.area) {
    area = currentUser.area;
    const areaSel = $('#fArea');
    if (areaSel) areaSel.value = currentUser.area;
  }

  const datosGuardar = { area, indicador, anio, mes, valor, meta };
  log('Datos a guardar', datosGuardar);

  try {
    // Validación de autorización desde auth.js (si existe)
    if (window.authSystem && typeof authSystem.validarOperacionEscritura === 'function') {
      const ok = authSystem.validarOperacionEscritura('upsert_medicion', { area, anio, mes });
      if (!ok) {
        // La función de auth ya debió notificar el motivo
        return;
      }
    }

    // Mostrar estado en botón
    const botonGuardar = document.querySelector('button[onclick="guardarMedicion()"]');
    const textoOriginal = botonGuardar?.innerHTML || 'Guardar';
    mostrarCargando(botonGuardar, true);

    // Upsert en tabla 'medicion'
    const { data, error } = await sb
      .from('medicion')
      .upsert(datosGuardar, { onConflict: 'area,indicador,anio,mes' });

    if (error) {
      logError('Error al guardar medición', error);
      mostrarNotificacion(`${MENSAJES.ERROR_GUARDAR}: ${error.message}`, 'error');
      return;
    }

    mostrarNotificacion(MENSAJES.EXITO_GUARDAR, 'success');
    log('Medición guardada correctamente', data);

    // Limpiar inputs y recargar datos
    limpiarCamposEntrada();
    await cargarDatosCaptura();
  } catch (error) {
    logError('Error en guardarMedicion', error);
    mostrarNotificacion('Error inesperado al guardar', 'error');
  } finally {
    // Restaurar botón
    const botonGuardar = document.querySelector('button[onclick="guardarMedicion()"]');
    if (botonGuardar) {
      botonGuardar.disabled = false;
      botonGuardar.innerHTML = 'Guardar';
    }
    actualizarEstadoBotonGuardar();
  }
}

/**
 * Control del botón Guardar (habilitado solo en condiciones válidas)
 */
function actualizarEstadoBotonGuardar() {
  const btn = document.querySelector('button[onclick="guardarMedicion()"]');
  if (!btn) return;

  const anio = parseInt($('#fAnio')?.value);
  const mes = parseInt($('#fMes')?.value);
  const area = $('#fArea')?.value;
  const indicador = $('#fIndicador')?.value;

  let habilitado = true;

  // Reglas duras
  if (!verificarPermisos || !verificarPermisos('capturar')) habilitado = false;
  if (!area || !indicador) habilitado = false;
  if (anio !== ANO_ACTUAL) habilitado = false;
  if (mes !== capturaData.currentMonth) habilitado = false;

  // Capturista: solo su área
  if (currentUser?.rol === ROLES.CAPTURISTA && currentUser.area && area !== currentUser.area) {
    habilitado = false;
  }

  btn.disabled = !habilitado;
  btn.classList.toggle('opacity-60', !habilitado);
  btn.classList.toggle('cursor-not-allowed', !habilitado);
}

/**
 * Limpiezas / utilidades UI
 */
function limpiarFormularioCaptura() {
  const areaSelect = $('#fArea');
  if (areaSelect) areaSelect.value = currentUser?.area || '';

  const indicadorSelect = $('#fIndicador');
  if (indicadorSelect) indicadorSelect.innerHTML = '<option value="">Seleccionar...</option>';

  limpiarCamposEntrada();
  limpiarDatosCaptura();
  actualizarEstadoBotonGuardar();
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

  const tbody = $('#tbodyCaptura');
  if (tbody) tbody.innerHTML = '';

  if (typeof currentChart !== 'undefined' && currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

/**
 * Prellenar inputs con el mes vigente si existen datos
 */
function cargarDatosMesPorDefecto() {
  if (!capturaData.selectedArea || !capturaData.selectedIndicador) return;

  const datoMesActual = capturaData.datosActuales.find(d => d.mes === capturaData.currentMonth);
  if (datoMesActual) {
    const valorInput = $('#fValor');
    const metaInput = $('#fMeta');

    if (valorInput) valorInput.value = (datoMesActual.valor ?? '') === '' ? '' : datoMesActual.valor;
    if (metaInput) metaInput.value = (datoMesActual.meta  ?? '') === '' ? '' : datoMesActual.meta;
  }
}

/**
 * Exportación CSV (solo lo que está cargado)
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
 * Debug
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

// Exponer funciones globales
window.guardarMedicion = guardarMedicion;
window.inicializarModuloCaptura = inicializarModuloCaptura;
window.exportarDatosCaptura = exportarDatosCaptura;
window.debugCaptura = debugCaptura;
