// ====================================
// ARCHIVO: captura.js
// Módulo de Captura (robusto y restringido a mes vigente del año actual)
// ====================================

// --------- Arranque DEFENSIVO (defaults si faltan) ---------
if (typeof window.MESES === 'undefined' || !Array.isArray(MESES) || MESES.length !== 12) {
  window.MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
}
if (typeof window.INDICADORES === 'undefined') {
  window.INDICADORES = { operaciones: "Operaciones", pasajeros: "Pasajeros", toneladas: "Toneladas" };
}
if (typeof window.ANO_ACTUAL === 'undefined' || !Number.isInteger(ANO_ACTUAL)) {
  window.ANO_ACTUAL = new Date().getFullYear();
}
if (typeof window.AREAS === 'undefined') {
  // Ajusta a tu catálogo real si difiere
  window.AREAS = { comercial: "Aviación Comercial", general: "Aviación General", carga: "Aviación de Carga" };
}
if (typeof window.ROLES === 'undefined') {
  window.ROLES = { ADMIN: 'administrador', SUBDIRECTOR: 'subdirector', CAPTURISTA: 'capturista' };
}
console.log("[CAPTURA] bootstrap", {
  ANO_ACTUAL, HAVE_MESES: Array.isArray(MESES)&&MESES.length, AREAS_KEYS: Object.keys(AREAS||{}),
  INDICADORES_KEYS: Object.keys(INDICADORES||{}), USER: window.currentUser
});

// --------- Estado del módulo ---------
let capturaData = {
  currentYear:
    typeof ANO_ACTUAL !== "undefined" && Number.isInteger(ANO_ACTUAL)
      ? ANO_ACTUAL
      : new Date().getFullYear(),
  currentMonth:
    typeof obtenerMesActual === "function"
      ? obtenerMesActual()
      : new Date().getMonth() + 1,
  selectedArea: null,
  selectedIndicador: null,
  datosActuales: []
};

let _capturaInitDone = false; // idempotencia

// ====================================
// Inicialización
// ====================================
function inicializarModuloCaptura() {
  if (_capturaInitDone) {
    // idempotente: permite re-entrar sin duplicar listeners/estado
    actualizarEstadoBotonGuardar();
    return;
  }

  log("Inicializando módulo de captura");

  try {
    llenarSelectoresCaptura();
    configurarEventosCaptura();
    limpiarFormularioCaptura();

    // Dispara flujo como si usuario hubiera elegido valores
    const areaSel = $("#fArea");
    if (areaSel && areaSel.value) {
      try { manejarCambioArea(); } catch (e) { console.warn("manejarCambioArea init:", e); }
    }
    const indSel = $("#fIndicador");
    if (indSel && indSel.value) {
      try { manejarCambioIndicador(); } catch (e) { console.warn("manejarCambioIndicador init:", e); }
    }

    actualizarEstadoBotonGuardar();
    _capturaInitDone = true;
    log("Módulo de captura inicializado correctamente");
  } catch (error) {
    logError("Error al inicializar módulo de captura", error);
    throw error;
  }
}

function llenarSelectoresCaptura() {
  llenarSelectorAnios();   // Año actual
  llenarSelectorMeses();   // Mes vigente
  llenarSelectorAreas();   // Áreas (capturista: solo su área válida)
  // Indicadores se llenan cuando se elige área
}

// ====================================
// Selects: Año / Mes / Área / Indicador
// ====================================
function llenarSelectorAnios() {
  const anioActual =
    typeof ANO_ACTUAL !== "undefined" && Number.isInteger(ANO_ACTUAL)
      ? ANO_ACTUAL
      : new Date().getFullYear();

  const opcionesAnios = [{ valor: anioActual, texto: String(anioActual) }];
  llenarSelect("#fAnio", opcionesAnios, anioActual);
  capturaData.currentYear = anioActual;

  const anioSel = $("#fAnio");
  if (anioSel && currentUser?.rol === ROLES.CAPTURISTA) {
    anioSel.disabled = true;
    anioSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorMeses() {
  const mesActual =
    typeof obtenerMesActual === "function"
      ? obtenerMesActual()
      : new Date().getMonth() + 1;

  capturaData.currentMonth = mesActual;

  const opcionesMeses = MESES.map((mes, i) => ({ valor: i + 1, texto: mes }));
  llenarSelect("#fMes", opcionesMeses, mesActual);

  const mesSel = $("#fMes");
  if (mesSel && currentUser?.rol === ROLES.CAPTURISTA) {
    mesSel.value = mesActual;
    mesSel.disabled = true;
    mesSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorAreas() {
  const opciones = [
    { valor: "", texto: "Seleccionar..." },
    ...Object.entries(AREAS).map(([clave, nombre]) => ({ valor: clave, texto: nombre }))
  ];
  llenarSelect("#fArea", opciones);

  const areaSel = $("#fArea");
  const areaUsuario = currentUser?.area;
  const areaValida = areaUsuario && Object.prototype.hasOwnProperty.call(AREAS, areaUsuario);

  // Capturista: si su área existe en catálogo, la fijamos; si no, dejamos elegir
  if (currentUser?.rol === ROLES.CAPTURISTA && areaSel) {
    if (areaValida) {
      areaSel.value = areaUsuario;
      capturaData.selectedArea = areaUsuario;
      llenarSelectorIndicadores(areaUsuario);
    } else {
      areaSel.value = "";
      capturaData.selectedArea = null;
      console.warn("[CAPTURA] área de usuario no coincide con AREAS:", areaUsuario, "→ dejar elegir");
    }
  }
}

function llenarSelectorIndicadores(area) {
  const sel = $("#fIndicador");
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar...</option>';

  // Mapa explícito por área (ajústalo si tu lógica real difiere)
  const POR_AREA = {
    comercial: ["operaciones", "pasajeros"],
    general:   ["operaciones", "pasajeros"],
    carga:     ["operaciones", "toneladas"],
    // fallback si llegara 'operaciones' como "área"
    operaciones: ["operaciones", "pasajeros"]
  };

  const lista = POR_AREA[area] || [];
  if (lista.length === 0) {
    console.warn("[CAPTURA] sin indicadores para área:", area, "→ revisa AREAS/área usuario");
  }
  lista.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = INDICADORES[k] || k;
    sel.appendChild(opt);
  });
}

// ====================================
// Eventos y Handlers
// ====================================
function configurarEventosCaptura() {
  const areaSelect = $("#fArea");
  if (areaSelect) areaSelect.addEventListener("change", manejarCambioArea);

  const indicadorSelect = $("#fIndicador");
  if (indicadorSelect) indicadorSelect.addEventListener("change", manejarCambioIndicador);

  const anioSelect = $("#fAnio");
  if (anioSelect) anioSelect.addEventListener("change", manejarCambioAnio);

  const mesSelect = $("#fMes");
  if (mesSelect) mesSelect.addEventListener("change", () => {
    capturaData.currentMonth = parseInt($("#fMes").value);
    actualizarEstadoBotonGuardar();
  });

  const valorInput = $("#fValor");
  if (valorInput) {
    valorInput.addEventListener("input", validarEntradaNumerica);
    valorInput.addEventListener("blur", formatearEntradaNumerica);
  }

  const metaInput = $("#fMeta");
  if (metaInput) {
    metaInput.addEventListener("input", validarEntradaNumerica);
    metaInput.addEventListener("blur", formatearEntradaNumerica);
  }
}

function manejarCambioArea() {
  let area = $("#fArea").value;

  // Capturista: si su área es válida en catálogo, forzarla
  const areaUsuario = currentUser?.area;
  const areaValidaUsuario =
    currentUser?.rol === ROLES.CAPTURISTA &&
    areaUsuario &&
    Object.prototype.hasOwnProperty.call(AREAS, areaUsuario);

  if (areaValidaUsuario) {
    area = areaUsuario;
    $("#fArea").value = areaUsuario;
  }

  capturaData.selectedArea = area;
  log("Cambio de área", { area });

  llenarSelectorIndicadores(area);
  limpiarDatosCaptura();

  const indicador = $("#fIndicador").value;
  if (area && indicador) {
    cargarDatosCaptura();
  }

  actualizarEstadoBotonGuardar();
}

function manejarCambioIndicador() {
  const indicador = $("#fIndicador").value;
  capturaData.selectedIndicador = indicador;

  log("Cambio de indicador", { indicador });

  if (indicador && capturaData.selectedArea) {
    cargarDatosCaptura();
  } else {
    limpiarDatosCaptura();
  }

  actualizarEstadoBotonGuardar();
}

function manejarCambioAnio() {
  // Forzar año actual siempre en estado interno / UI
  const anio = Number.isInteger(ANO_ACTUAL) ? ANO_ACTUAL : new Date().getFullYear();
  if ($("#fAnio")) $("#fAnio").value = anio;

  capturaData.currentYear = anio;
  log("Cambio de año (forzado a actual)", { anio });

  if (capturaData.selectedArea && capturaData.selectedIndicador) {
    cargarDatosCaptura();
  }

  actualizarEstadoBotonGuardar();
}

// ====================================
// Validaciones de valor
// ====================================
function validarEntradaNumerica(event) {
  const input = event.target;
  const valor = input.value;

  const patron = /^-?\d*\.?\d*$/;
  if (!patron.test(valor)) {
    input.value = valor.replace(/[^-\d.]/g, "");
  }

  const numeroValor = parseFloat(input.value);
  if (!isNaN(numeroValor)) {
    if (
      numeroValor < VALIDACIONES.VALOR_MINIMO ||
      numeroValor > VALIDACIONES.VALOR_MAXIMO
    ) {
      input.classList.add("border-red-500");
    } else {
      input.classList.remove("border-red-500");
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

// ====================================
// Carga de datos (hardening capturista)
// ====================================
async function cargarDatosCaptura() {
  let area = capturaData.selectedArea;
  let indicador = capturaData.selectedIndicador;
  let anio = capturaData.currentYear;

  if (!area || !indicador || !anio) {
    log("Datos insuficientes para cargar", { area, indicador, anio });
    return;
  }

  // Hardening: capturista => año actual y su área (si válida)
  if (currentUser?.rol === ROLES.CAPTURISTA) {
    anio = Number.isInteger(ANO_ACTUAL) ? ANO_ACTUAL : new Date().getFullYear();

    if (
      currentUser.area &&
      Object.prototype.hasOwnProperty.call(AREAS, currentUser.area)
    ) {
      area = currentUser.area;
      const areaSel = $("#fArea");
      if (areaSel && areaSel.value !== area) areaSel.value = area;
    }

    const anioSel = $("#fAnio");
    if (anioSel) anioSel.value = anio;
  }

  try {
    log("Cargando datos de captura", { area, indicador, anio });

    const botonGuardar = document.querySelector('button[onclick="guardarMedicion()"]');
    if (botonGuardar) mostrarCargando(botonGuardar, true);

    const { data, error } = await sb
      .from("v_medicion")
      .select("*")
      .eq("area", area)
      .eq("indicador", indicador)
      .eq("anio", anio)
      .order("mes");

    if (error) {
      logError("Error cargando datos de captura", error);
      mostrarNotificacion(MENSAJES.ERROR_CARGA_DATOS, "error");
      return;
    }

    capturaData.datosActuales = data;

    actualizarTablaCaptura(data);
    await crearGraficaCaptura(area, indicador);
    cargarDatosMesPorDefecto();

    log("Datos de captura cargados correctamente", { registros: data.length });
  } catch (error) {
    logError("Error en cargarDatosCaptura", error);
    mostrarNotificacion("Error al cargar los datos", "error");
  } finally {
    const botonGuardar = document.querySelector('button[onclick="guardarMedicion()"]');
    if (botonGuardar) mostrarCargando(botonGuardar, false);
    actualizarEstadoBotonGuardar();
  }
}

// ====================================
// Tabla
// ====================================
function actualizarTablaCaptura(datos) {
  const tbody = $("#tbodyCaptura");
  if (!tbody) return;

  tbody.innerHTML = "";

  for (let mes = 1; mes <= 12; mes++) {
    const datoMes = datos.find((d) => d.mes === mes) || {};
    const tr = document.createElement("tr");

    // Cumplimiento
    let cumplimientoTexto = "-";
    let cumplimientoClase = "";
    if (datoMes.cumplimiento !== null && datoMes.cumplimiento !== undefined) {
      cumplimientoTexto = formatearPorcentaje(datoMes.cumplimiento);
      if (datoMes.cumplimiento >= 100) {
        cumplimientoClase = "text-green-600 font-semibold";
      } else if (datoMes.cumplimiento >= 80) {
        cumplimientoClase = "text-yellow-600 font-medium";
      } else {
        cumplimientoClase = "text-red-600";
      }
    }

    // Formatos (permitiendo 0)
    const valorFormateado =
      datoMes.valor === 0 || datoMes.valor
        ? formatearNumero(datoMes.valor)
        : "";
    const metaFormateada =
      datoMes.meta === 0 || datoMes.meta ? formatearNumero(datoMes.meta) : "";

    tr.innerHTML = `
      <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes - 1]}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${valorFormateado}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${metaFormateada}</td>
      <td class="border border-gray-300 px-4 py-2 text-right ${cumplimientoClase}">${cumplimientoTexto}</td>
    `;

    // Destacar mes vigente del año actual
    const anioActual = Number.isInteger(ANO_ACTUAL) ? ANO_ACTUAL : new Date().getFullYear();
    if (mes === capturaData.currentMonth && capturaData.currentYear === anioActual) {
      tr.classList.add("bg-blue-50");
    }

    tbody.appendChild(tr);
  }
}

// ====================================
// Validación de formulario (reglas duras)
// ====================================
function validarFormulario
