// ====================================
// captura.js (completo, con áreas padre/hija)
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
  carga:       "Aviación de Carga"
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

// ---- Helpers mínimos si no existen (de utils.js)
function $(sel) { return document.querySelector(sel); }
function llenarSelect(sel, opciones, valorPorDefecto) {
  const el = $(sel); if (!el) return;
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

// ====================================
// ÁREAS PADRE / HIJAS
// ====================================

// Áreas hijas permitidas cuando el usuario pertenece a un área padre
const CHILDREN_AREAS = {
  operaciones: ["comercial", "general", "carga"], // padre → hijas
  // agrega más padres si aparecen
};

function getUserAllowedAreas() {
  // Admin/Subdirector: todas
  if (currentUser?.rol === ROLES.ADMIN || currentUser?.rol === ROLES.SUBDIRECTOR) {
    return Object.keys(AREAS);
  }
  const userArea = currentUser?.area;
  if (!userArea) return Object.keys(AREAS);

  // Si su área es padre → hijas
  if (CHILDREN_AREAS[userArea]) return CHILDREN_AREAS[userArea].filter(k => AREAS[k]);

  // Si su área es hoja (existe en catálogo) → solo esa
  if (AREAS[userArea]) return [userArea];

  // Fallback
  return Object.keys(AREAS);
}

function isAreaAllowedForUser(area) {
  return getUserAllowedAreas().includes(area);
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
  llenarSelectorAreas();
  configurarEventos();
  limpiarFormulario();
  // si ya quedó fija un área (caso hoja), dispara flujo
  if ($("#fArea")?.value) manejarCambioArea();
  if ($("#fIndicador")?.value) manejarCambioIndicador();
  actualizarEstadoBotonGuardar();
}

// ====================================
// Selects
// ====================================
function llenarSelectorAnios(){
  llenarSelect("#fAnio", [{valor: ANO_ACTUAL, texto: String(ANO_ACTUAL)}], ANO_ACTUAL);
  const anioSel = $("#fAnio");
  if (anioSel && currentUser?.rol === ROLES.CAPTURISTA){
    anioSel.disabled = true; anioSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorMeses(){
  const mesActual = new Date().getMonth() + 1;
  capturaData.currentMonth = mesActual;
  const opciones = MESES.map((m,i)=>({valor:i+1, texto:m}));
  llenarSelect("#fMes", opciones, mesActual);
  const mesSel = $("#fMes");
  if (mesSel && currentUser?.rol === ROLES.CAPTURISTA){
    mesSel.disabled = true; mesSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorAreas(){
  const allowed = getUserAllowedAreas(); // clave

  const opciones = [
    {valor:"", texto:"Seleccionar..."},
    ...allowed.map(k => ({valor:k, texto:AREAS[k]}))
  ];
  llenarSelect("#fArea", opciones);

  const areaSel = $("#fArea");

  // Capturista:
  if (currentUser?.rol === ROLES.CAPTURISTA && areaSel) {
    const userArea = currentUser.area;

    // Si su área es HOJA (existe en catálogo y no es padre), fijar y bloquear
    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      areaSel.value = userArea;
      areaSel.disabled = true;
      areaSel.classList.add("disabled-by-role");
      capturaData.selectedArea = userArea;
      llenarSelectorIndicadores(userArea);
      return;
    }

    // Si su área es PADRE (p.ej. "operaciones"), NO forzamos:
    // deberá elegir una de las hijas permitidas
    areaSel.value = "";
    capturaData.selectedArea = null;
  }
}

function llenarSelectorIndicadores(area){
  const sel = $("#fIndicador"); if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar...</option>';

  // Mapa por subárea (ajusta si tu lógica difiere)
  const MAP = {
    comercial:   ["operaciones", "pasajeros"],
    general:     ["operaciones", "pasajeros"],
    carga:       ["operaciones", "toneladas"],
    // Si llegase “operaciones” como subárea (no debería en este modelo), fallback:
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
  $("#fArea")?.addEventListener("change", manejarCambioArea);
  $("#fIndicador")?.addEventListener("change", manejarCambioIndicador);
  $("#fAnio")?.addEventListener("change", manejarCambioAnio);
  $("#fMes")?.addEventListener("change", ()=> actualizarEstadoBotonGuardar());

  $("#fValor")?.addEventListener("input", validarEntradaNumerica);
  $("#fValor")?.addEventListener("blur", formatearEntradaNumerica);
  $("#fMeta")?.addEventListener("input", validarEntradaNumerica);
  $("#fMeta")?.addEventListener("blur", formatearEntradaNumerica);
}

function manejarCambioArea(){
  let area = $("#fArea").value;

  if (currentUser?.rol === ROLES.CAPTURISTA) {
    const userArea = currentUser.area;

    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      // Hoja: forzar exactamente su área
      area = userArea;
      $("#fArea").value = userArea;
    } else {
      // Padre: validar que sea una hija permitida
      if (!isAreaAllowedForUser(area)) {
        capturaData.selectedArea = null;
        mostrarNotificacion("Seleccione un área permitida", "warning");
        actualizarEstadoBotonGuardar();
        return;
      }
    }
  }

  capturaData.selectedArea = area;
  log("Cambio de área", { area });

  llenarSelectorIndicadores(area);
  limpiarDatos(); // resetea tabla/graf
  const indicador = $("#fIndicador")?.value;
  if (area && indicador) cargarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioIndicador(){
  capturaData.selectedIndicador = $("#fIndicador").value;
  if (capturaData.selectedIndicador && capturaData.selectedArea) cargarDatos();
  else limpiarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioAnio(){
  // año siempre actual
  $("#fAnio").value = String(ANO_ACTUAL);
  capturaData.currentYear = ANO_ACTUAL;
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
// Carga de datos
// ====================================
async function cargarDatos(){
  let area = capturaData.selectedArea;
  let indicador = capturaData.selectedIndicador;
  let anio = capturaData.currentYear;

  if (!area || !indicador || !anio) return;

  if (currentUser?.rol === ROLES.CAPTURISTA){
    anio = ANO_ACTUAL; $("#fAnio").value = String(anio);

    const userArea = currentUser.area;
    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      // Hoja → forzar su área
      area = userArea; if ($("#fArea").value !== area) $("#fArea").value = area;
    } else {
      // Padre → validar selección
      if (!isAreaAllowedForUser(area)) {
        mostrarNotificacion("Seleccione un área válida para su perfil", "error");
        return;
      }
    }
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
    await crearGraficaCaptura(area, indicador); // existente en charts.js
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
  const tbody = $("#tbodyCaptura"); if (!tbody) return;
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
  const area = $("#fArea")?.value;
  const indicador = $("#fIndicador")?.value;
  const anio = parseInt($("#fAnio")?.value);
  const mes  = parseInt($("#fMes")?.value);

  if (!area || !indicador || !anio || !mes){
    mostrarNotificacion("Seleccione área, indicador, año y mes", "error"); return false;
  }
  if (anio !== ANO_ACTUAL){
    mostrarNotificacion(`Solo puede capturarse el año ${ANO_ACTUAL}`, "error"); return false;
  }
  if (mes !== capturaData.currentMonth){
    const mesTxt = MESES[capturaData.currentMonth-1];
    mostrarNotificacion(`Solo puede capturarse el mes vigente (${mesTxt})`, "error"); return false;
  }

  // Capturista: reglas padre/hoja
  if (currentUser?.rol === ROLES.CAPTURISTA) {
    const userArea = currentUser.area;
    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      // Hoja: debe coincidir exactamente
      if (area !== userArea) {
        mostrarNotificacion("No está autorizado para capturar en esta área", "error");
        return false;
      }
    } else {
      // Padre: el área elegida debe estar dentro de las hijas permitidas
      if (!isAreaAllowedForUser(area)) {
        mostrarNotificacion("Seleccione un área válida para su perfil", "error");
        return false;
      }
    }
  }

  // Validar números
  const valor = limpiarNumero($("#fValor")?.value);
  const meta  = limpiarNumero($("#fMeta")?.value);
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

  let area = $("#fArea").value;
  const indicador = $("#fIndicador").value;
  const anio = ANO_ACTUAL;
  const mes  = capturaData.currentMonth;
  let valor = limpiarNumero($("#fValor").value) || 0;
  let meta  = limpiarNumero($("#fMeta").value)  || 0;

  if (currentUser?.rol === ROLES.CAPTURISTA) {
    const userArea = currentUser.area;
    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      // Hoja: forzar su área
      area = userArea; $("#fArea").value = userArea;
    } else {
      // Padre: validar hija permitida
      if (!isAreaAllowedForUser(area)) {
        mostrarNotificacion("Seleccione un área válida para su perfil", "error");
        return;
      }
    }
  }

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
  const anio = parseInt($("#fAnio")?.value);
  const mes  = parseInt($("#fMes")?.value);
  const area = $("#fArea")?.value;
  const indicador = $("#fIndicador")?.value;

  let ok = true;
  if (typeof verificarPermisos === "function" ? !verificarPermisos("capturar") : false) ok = false;
  if (!area || !indicador) ok = false;
  if (anio !== ANO_ACTUAL) ok = false;
  if (mes  !== capturaData.currentMonth) ok = false;

  if (currentUser?.rol === ROLES.CAPTURISTA) {
    const userArea = currentUser.area;
    if (!CHILDREN_AREAS[userArea] && AREAS[userArea]) {
      if (area !== userArea) ok = false; // hoja: debe coincidir
    } else {
      if (!isAreaAllowedForUser(area)) ok = false; // padre: hija permitida
    }
  }

  btn.disabled = !ok;
  btn.classList.toggle("opacity-60", !ok);
  btn.classList.toggle("cursor-not-allowed", !ok);
}

// ====================================
// Limpiezas y utilidades
// ====================================
function limpiarFormulario(){
  const areaSel = $("#fArea");
  if (currentUser?.rol === ROLES.CAPTURISTA &&
      currentUser.area && AREAS[currentUser.area] && !CHILDREN_AREAS[currentUser.area]) {
    // Hoja → bloquear a su área
    if (areaSel) { areaSel.value = currentUser.area; areaSel.disabled = true; areaSel.classList.add("disabled-by-role"); }
  }
  const indSel = $("#fIndicador"); if (indSel) indSel.innerHTML = '<option value="">Seleccionar...</option>';
  limpiarCampos();
  limpiarDatos();
  actualizarEstadoBotonGuardar();
}

function limpiarCampos(){
  const v = $("#fValor"); if (v){ v.value = ""; v.classList.remove("border-red-500"); }
  const m = $("#fMeta");  if (m){ m.value = ""; m.classList.remove("border-red-500"); }
}

function limpiarDatos(){
  capturaData.datosActuales = [];
  const tbody = $("#tbodyCaptura"); if (tbody) tbody.innerHTML = "";
  if (typeof window.currentChart !== "undefined" && window.currentChart){
    try{ window.currentChart.destroy(); }catch{}
    window.currentChart = null;
  }
}

function prellenarMesVigente(){
  const d = capturaData.datosActuales.find(x=>x.mes === capturaData.currentMonth);
  if (!d) return;
  if ($("#fValor")) $("#fValor").value = (d.valor===0 || d.valor) ? d.valor : "";
  if ($("#fMeta"))  $("#fMeta").value  = (d.meta===0  || d.meta)  ? d.meta  : "";
}

// ====================================
// Export simple CSV
// ====================================
function exportarDatosCaptura(){
  if (!capturaData.datosActuales?.length){ mostrarNotificacion("No hay datos para exportar","warning"); return; }
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
window.initCaptura = inicializarModuloCaptura;           // alias por compatibilidad
window.guardarMedicion = guardarMedicion;
window.exportarDatosCaptura = exportarDatosCaptura;
window.cargarDatosCaptura = cargarDatos;                  // alias
window.limpiarDatosCaptura = limpiarDatos;               // alias

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
