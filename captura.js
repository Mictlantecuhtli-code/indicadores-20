// ====================================
// captura.js (abierto para todos; capturista restringido a mes vigente)
// ====================================

// ---- Defaults defensivos (si faltan en config.js)
window.MESES = Array.isArray(window.MESES) && window.MESES.length === 12
  ? window.MESES
  : ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

window.INDICADORES = window.INDICADORES || {
  operaciones: "Operaciones",
  pasajeros:   "Pasajeros",
  toneladas:   "Toneladas"
};

window.AREAS = window.AREAS || {
  comercial:   "Aviación Comercial",
  general:     "Aviación General",
  carga:       "Aviación de Carga",
  // puedes agregar más claves si las usas en BD
};

window.ROLES = window.ROLES || {
  ADMIN: "administrador",
  SUBDIRECTOR: "subdirector",
  CAPTURISTA: "capturista"
};

window.ANO_ACTUAL = Number.isInteger(window.ANO_ACTUAL)
  ? window.ANO_ACTUAL
  : new Date().getFullYear();

window.VALIDACIONES = window.VALIDACIONES || {
  VALOR_MINIMO: 0,
  VALOR_MAXIMO: 1_000_000_000,
  DECIMALES_PERMITIDOS: 2
};

window.MENSAJES = window.MENSAJES || {
  ERROR_CARGA_DATOS: "No se pudieron cargar los datos",
  ERROR_GUARDAR: "Error al guardar",
  EXITO_GUARDAR: "Guardado correctamente"
};

// ---- Helpers mínimos (por si utils.js no está)
function llenarSelect(sel, opciones, valorPorDefecto) {
  const el = document.querySelector(sel); if (!el) return;
  el.innerHTML = "";
  for (const opt of opciones) {
    const o = document.createElement("option");
    o.value = String(opt.valor);
    o.textContent = opt.texto;
    el.appendChild(o);
  }
  if (valorPorDefecto !== undefined) el.value = String(valorPorDefecto);
}
function log(...a){ try{ console.log(...a);}catch{} }
function logError(...a){ try{ console.error(...a);}catch{} }
function mostrarNotificacion(msg, tipo){ try{ console.log(`[${tipo||"info"}] ${msg}`);}catch{} }
function mostrarCargando(btn, on){
  if (!btn) return;
  if (on){ btn.disabled = true; btn.dataset._txt = btn.innerHTML; btn.innerHTML = "Guardando..."; }
  else { btn.disabled = false; if (btn.dataset._txt) btn.innerHTML = btn.dataset._txt; }
}
function formatearNumero(n){ return (n===0 || n) ? Number(n).toLocaleString("es-MX") : ""; }
function formatearPorcentaje(p){ return (p===0 || p) ? `${Number(p).toFixed(1)}%` : ""; }
function limpiarNumero(v){ if (v===null || v===undefined || v==="") return null; const x = Number(String(v).replace(/,/g,"")); return isNaN(x)? null : x; }

function obtenerRolActual(){
  return currentUser && currentUser.rol ? currentUser.rol : null;
}

function agregarEvento(selector, evento, handler){
  const elemento = document.querySelector(selector);
  if (elemento) {
    elemento.addEventListener(evento, handler);
  }
  return elemento;
}

function obtenerValorCampo(selector){
  const elemento = document.querySelector(selector);
  return elemento ? elemento.value : '';
}

// ====================================
// Estado
// ====================================
const capturaData = {
  currentYear: window.ANO_ACTUAL,
  currentMonth: new Date().getMonth() + 1,
  selectedArea: null,
  selectedIndicador: null,
  datosActuales: []
};

// ====================================
// Inicialización
// ====================================
function inicializarModuloCaptura(){
  log("[CAPTURA] init");
  llenarSelectorAnios();
  llenarSelectorMeses();
  llenarSelectorAreas();      // abierto: todas las áreas del catálogo
  configurarEventos();
  limpiarFormulario();
  // Disparar si ya hay valores prefijados
  const areaSelect = document.querySelector("#fArea");
  if (areaSelect && areaSelect.value) { manejarCambioArea(); }
  const indicadorSelect = document.querySelector("#fIndicador");
  if (indicadorSelect && indicadorSelect.value) { manejarCambioIndicador(); }
  actualizarEstadoBotonGuardar();
}

// ====================================
// Selects
// ====================================
function llenarSelectorAnios(){
  // Por ahora dejamos solo año actual. Si quieres más, agrega aquí más opciones.
  llenarSelect("#fAnio", [{valor: ANO_ACTUAL, texto: String(ANO_ACTUAL)}], ANO_ACTUAL);

  // Capturista no puede cambiar año
  const anioSel = document.querySelector("#fAnio");
  const rolActual = obtenerRolActual();
  if (anioSel && rolActual === ROLES.CAPTURISTA){
    anioSel.disabled = true; anioSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorMeses(){
  const mesActual = new Date().getMonth() + 1;
  capturaData.currentMonth = mesActual;

  const opciones = MESES.map((m,i)=>({valor:i+1, texto:m}));
  llenarSelect("#fMes", opciones, mesActual);

  // Capturista no puede cambiar mes (vigente)
  const mesSel = document.querySelector("#fMes");
  const rolActual = obtenerRolActual();
  if (mesSel && rolActual === ROLES.CAPTURISTA){
    mesSel.disabled = true; mesSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorAreas(){
  // Todos los roles ven TODAS las áreas
  const opciones = [{valor:"", texto:"Seleccionar..."}, ...Object.entries(AREAS).map(([k,v])=>({valor:k, texto:v}))];
  llenarSelect("#fArea", opciones);
}

function llenarSelectorIndicadores(area){
  const sel = document.querySelector("#fIndicador"); if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar...</option>';

  // Mapa por área (ajústalo si tu lógica difiere)
  const MAP = {
    comercial:   ["operaciones", "pasajeros"],
    general:     ["operaciones", "pasajeros"],
    carga:       ["operaciones", "toneladas"],
    // fallback por si alguna vez usas 'operaciones' como área hoja
    operaciones: ["operaciones", "pasajeros"]
  };

  const lista = MAP[area] || [];
  for (const k of lista){
    const o = document.createElement("option");
    o.value = k; o.textContent = INDICADORES[k] || k;
    sel.appendChild(o);
  }
}

// ====================================
// Eventos
// ====================================
function configurarEventos(){
  agregarEvento("#fArea", "change", manejarCambioArea);
  agregarEvento("#fIndicador", "change", manejarCambioIndicador);
  agregarEvento("#fAnio", "change", manejarCambioAnio);
  agregarEvento("#fMes", "change", () => actualizarEstadoBotonGuardar());

  agregarEvento("#fValor", "input", validarEntradaNumerica);
  agregarEvento("#fValor", "blur", formatearEntradaNumerica);
  agregarEvento("#fMeta", "input", validarEntradaNumerica);
  agregarEvento("#fMeta", "blur", formatearEntradaNumerica);
}

function manejarCambioArea(){
  const areaSelect = document.querySelector("#fArea");
  const area = areaSelect ? areaSelect.value : '';
  capturaData.selectedArea = area || null;
  log("Cambio de área", { area });

  llenarSelectorIndicadores(area);
  limpiarDatos();
  const indicador = obtenerValorCampo("#fIndicador");
  if (area && indicador) cargarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioIndicador(){
  const indicadorSelect = document.querySelector("#fIndicador");
  capturaData.selectedIndicador = indicadorSelect ? indicadorSelect.value || null : null;
  if (capturaData.selectedIndicador && capturaData.selectedArea) cargarDatos();
  else limpiarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioAnio(){
  // Capturista: siempre forzar año actual en UI/estado
  const rolActual = obtenerRolActual();
  const anioSelect = document.querySelector("#fAnio");
  if (rolActual === ROLES.CAPTURISTA) {
    if (anioSelect) {
      anioSelect.value = String(ANO_ACTUAL);
    }
    capturaData.currentYear = ANO_ACTUAL;
  } else {
    const anioValor = anioSelect ? parseInt(anioSelect.value) : NaN;
    capturaData.currentYear = Number.isNaN(anioValor) ? ANO_ACTUAL : anioValor;
  }
  if (capturaData.selectedArea && capturaData.selectedIndicador) cargarDatos();
  actualizarEstadoBotonGuardar();
}

// ====================================
// Validaciones numéricas
// ====================================
function validarEntradaNumerica(e){
  const i = e.target;
  i.value = String(i.value).replace(/[^-\d.]/g,"");
  const n = parseFloat(i.value);
  if (!isNaN(n)){
    if (n < VALIDACIONES.VALOR_MINIMO || n > VALIDACIONES.VALOR_MAXIMO) i.classList.add("border-red-500");
    else i.classList.remove("border-red-500");
  }
}
function formatearEntradaNumerica(e){
  const i = e.target; const n = parseFloat(i.value);
  if (!isNaN(n)) i.value = n.toFixed(VALIDACIONES.DECIMALES_PERMITIDOS);
}

// ====================================
// Carga de datos (consulta a vista v_medicion)
// ====================================
async function cargarDatos(){
  const area = capturaData.selectedArea;
  const indicador = capturaData.selectedIndicador;
  let anio = capturaData.currentYear;

  if (!area || !indicador || !anio) return;

  // Capturista: ancla año al actual siempre
  const rolActual = obtenerRolActual();
  if (rolActual === ROLES.CAPTURISTA) {
    anio = ANO_ACTUAL;
    const anioSel = document.querySelector("#fAnio"); if (anioSel) anioSel.value = String(ANO_ACTUAL);
  }

  try{
    log("[CAPTURA] Cargando datos", {area, indicador, anio});
    const { data, error } = await sb
      .from("v_medicion")
      .select("*")
      .eq("area", area)
      .eq("indicador", indicador)
      .eq("anio", anio)
      .order("mes");

    if (error){ logError(error); mostrarNotificacion(MENSAJES.ERROR_CARGA_DATOS, "error"); return; }

    capturaData.datosActuales = data || [];
    actualizarTabla(capturaData.datosActuales);
    await crearGraficaCaptura(area, indicador); // función en charts.js
    prellenarMesVigente();
  } catch(err){
    logError(err);
    mostrarNotificacion("Error al cargar datos", "error");
  } finally {
    actualizarEstadoBotonGuardar();
  }
}

// ====================================
// Tabla
// ====================================
function actualizarTabla(datos){
  const tbody = document.querySelector("#tbodyCaptura"); if (!tbody) return;
  tbody.innerHTML = "";
  for (let mes=1; mes<=12; mes++){
    const d = datos.find(x=>x.mes===mes) || {};
    const tr = document.createElement("tr");

    let cumplimiento = "-"; let clase = "";
    if (d.cumplimiento===0 || d.cumplimiento){ 
      cumplimiento = formatearPorcentaje(d.cumplimiento);
      clase = d.cumplimiento >= 100 ? "text-green-600 font-semibold"
           : d.cumplimiento >= 80 ? "text-yellow-600 font-medium"
           : "text-red-600";
    }
    const val  = (d.valor===0 || d.valor) ? formatearNumero(d.valor) : "";
    const meta = (d.meta===0  || d.meta)  ? formatearNumero(d.meta)  : "";

    tr.innerHTML = `
      <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes-1]}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${val}</td>
      <td class="border border-gray-300 px-4 py-2 text-right">${meta}</td>
      <td class="border border-gray-300 px-4 py-2 text-right ${clase}">${cumplimiento}</td>
    `;
    if (mes === capturaData.currentMonth && capturaData.currentYear === ANO_ACTUAL){
      tr.classList.add("bg-blue-50");
    }
    tbody.appendChild(tr);
  }
}

// ====================================
// Form y guardado
// ====================================
function validarFormulario(){
  const area = obtenerValorCampo("#fArea");
  const indicador = obtenerValorCampo("#fIndicador");
  const anio = parseInt(obtenerValorCampo("#fAnio"), 10);
  const mes  = parseInt(obtenerValorCampo("#fMes"), 10);

  if (!area || !indicador || !anio || !mes){
    mostrarNotificacion("Seleccione área, indicador, año y mes", "error"); return false;
  }

  // Restricción SOLO para capturista:
  const rolActual = obtenerRolActual();
  if (rolActual === ROLES.CAPTURISTA) {
    if (anio !== ANO_ACTUAL){
      mostrarNotificacion(`Solo puede capturarse el año ${ANO_ACTUAL}`, "error"); return false;
    }
    if (mes !== capturaData.currentMonth){
      const mesTxt = MESES[capturaData.currentMonth-1];
      mostrarNotificacion(`Solo puede capturarse el mes vigente (${mesTxt})`, "error"); return false;
    }
  }

  // Validar números
  const valor = limpiarNumero(obtenerValorCampo("#fValor"));
  const meta  = limpiarNumero(obtenerValorCampo("#fMeta"));
  if (valor===null || isNaN(valor)){ mostrarNotificacion("Ingrese un valor válido", "error"); return false; }
  if (meta===null  || isNaN(meta)) { mostrarNotificacion("Ingrese una meta válida",  "error"); return false; }
  if (valor < VALIDACIONES.VALOR_MINIMO || valor > VALIDACIONES.VALOR_MAXIMO){
    mostrarNotificacion("El valor está fuera de rango permitido", "error"); return false;
  }
  if (meta  < VALIDACIONES.VALOR_MINIMO || meta  > VALIDACIONES.VALOR_MAXIMO){
    mostrarNotificacion("La meta está fuera de rango permitido", "error"); return false;
  }
  return true;
}

async function guardarMedicion(){
  if (!validarFormulario()){ actualizarEstadoBotonGuardar(); return; }

  const area = obtenerValorCampo("#fArea");
  const indicador = obtenerValorCampo("#fIndicador");
  const rolActual = obtenerRolActual();
  const anio = rolActual === ROLES.CAPTURISTA ? ANO_ACTUAL : (parseInt(obtenerValorCampo("#fAnio"), 10) || ANO_ACTUAL);
  const mes  = rolActual === ROLES.CAPTURISTA ? capturaData.currentMonth : parseInt(obtenerValorCampo("#fMes"), 10);
  let valor = limpiarNumero(obtenerValorCampo("#fValor")) || 0;
  let meta  = limpiarNumero(obtenerValorCampo("#fMeta"))  || 0;

  // Validación extra desde auth.js si existe
  if (window.authSystem && typeof authSystem.validarOperacionEscritura === "function"){
    const ok = authSystem.validarOperacionEscritura("upsert_medicion", { area, anio, mes });
    if (!ok) return;
  }

  const btn = document.querySelector('button[onclick="guardarMedicion()"]');
  try{
    mostrarCargando(btn, true);
    const { data, error } = await sb
      .from("medicion")
      .upsert({ area, indicador, anio, mes, valor, meta }, { onConflict: "area,indicador,anio,mes" });
    if (error){ logError(error); mostrarNotificacion(`${MENSAJES.ERROR_GUARDAR}: ${error.message}`, "error"); return; }
    mostrarNotificacion(MENSAJES.EXITO_GUARDAR, "success");
    limpiarCampos();
    await cargarDatos();
  } catch(err){
    logError(err); mostrarNotificacion("Error inesperado al guardar", "error");
  } finally {
    mostrarCargando(btn, false);
    actualizarEstadoBotonGuardar();
  }
}

function actualizarEstadoBotonGuardar(){
  const btn = document.querySelector('button[onclick="guardarMedicion()"]');
  if (!btn) return;
  const anio = parseInt(obtenerValorCampo("#fAnio"), 10);
  const mes  = parseInt(obtenerValorCampo("#fMes"), 10);
  const area = obtenerValorCampo("#fArea");
  const indicador = obtenerValorCampo("#fIndicador");

  let ok = true;
  if (typeof verificarPermisos === "function" ? !verificarPermisos("capturar") : false) ok = false;
  if (!area || !indicador) ok = false;

  // Solo capturista está restringido por mes/año vigente
  const rolActual = obtenerRolActual();
  if (rolActual === ROLES.CAPTURISTA) {
    if (anio !== ANO_ACTUAL) ok = false;
    if (mes  !== capturaData.currentMonth) ok = false;
  }

  btn.disabled = !ok;
  btn.classList.toggle("opacity-60", !ok);
  btn.classList.toggle("cursor-not-allowed", !ok);
}

// ====================================
// Limpiezas y utilidades
// ====================================
function limpiarFormulario(){
  const indSel = document.querySelector("#fIndicador"); if (indSel) indSel.innerHTML = '<option value="">Seleccionar...</option>';
  limpiarCampos();
  limpiarDatos();
  actualizarEstadoBotonGuardar();
}

function limpiarCampos(){
  const v = document.querySelector("#fValor"); if (v){ v.value = ""; v.classList.remove("border-red-500"); }
  const m = document.querySelector("#fMeta");  if (m){ m.value = ""; m.classList.remove("border-red-500"); }
}

function limpiarDatos(){
  capturaData.datosActuales = [];
  const tbody = document.querySelector("#tbodyCaptura"); if (tbody) tbody.innerHTML = "";
  if (typeof window.currentChart !== "undefined" && window.currentChart){
    try{ window.currentChart.destroy(); }catch{}
    window.currentChart = null;
  }
}

function prellenarMesVigente(){
  const d = capturaData.datosActuales.find(x=>x.mes === capturaData.currentMonth);
  if (!d) return;
  const valorInput = document.querySelector("#fValor");
  if (valorInput) { valorInput.value = (d.valor===0 || d.valor) ? d.valor : ""; }
  const metaInput = document.querySelector("#fMeta");
  if (metaInput) { metaInput.value  = (d.meta===0  || d.meta)  ? d.meta  : ""; }
}

// ====================================
// Export simple CSV
// ====================================
function exportarDatosCaptura(){
  if (!Array.isArray(capturaData.datosActuales) || capturaData.datosActuales.length === 0){
    mostrarNotificacion("No hay datos para exportar","warning");
    return;
  }
  const filas = capturaData.datosActuales.map(d => [
    AREAS[d.area] || d.area,
    INDICADORES[d.indicador] || d.indicador,
    d.anio, MESES[d.mes-1], d.valor, d.meta, d.cumplimiento
  ]);
  const cab = ["Area","Indicador","Año","Mes","Valor","Meta","%Cumplimiento"];
  const csv = [cab, ...filas].map(r => r.map(x => (x==null?"":String(x))).join(",")).join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "captura.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ====================================
// Exponer API y aliases
// ====================================
window.inicializarModuloCaptura = inicializarModuloCaptura;
window.initCaptura = inicializarModuloCaptura;      // alias por compatibilidad
window.guardarMedicion = guardarMedicion;
window.exportarDatosCaptura = exportarDatosCaptura;
window.cargarDatosCaptura = cargarDatos;            // alias
window.limpiarDatosCaptura = limpiarDatos;          // alias

// ====================================
// Safe boot (arranca cuando hay catálogos)
// ====================================
(function(){
  function readyCfg(){
    return AREAS && Object.keys(AREAS).length && INDICADORES && MESES && MESES.length===12;
  }
  function boot(){ try{ inicializarModuloCaptura(); }catch(e){ console.error(e); } }
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      if (readyCfg()) boot(); else setTimeout(boot, 100);
    });
  } else {
    if (readyCfg()) boot(); else setTimeout(boot, 100);
  }
})();
