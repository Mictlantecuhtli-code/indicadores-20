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
//function $(sel) { return document.querySelector(sel); }
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
  if ($("#fArea")?.value) manejarCambioArea();
  if ($("#fIndicador")?.value) manejarCambioIndicador();
  actualizarEstadoBotonGuardar();
}

// ====================================
// Selects
// ====================================
function llenarSelectorAnios(){
  // Por ahora dejamos solo año actual. Si quieres más, agrega aquí más opciones.
  llenarSelect("#fAnio", [{valor: ANO_ACTUAL, texto: String(ANO_ACTUAL)}], ANO_ACTUAL);

  // Capturista no puede cambiar año
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

  // Capturista no puede cambiar mes (vigente)
  const mesSel = $("#fMes");
  if (mesSel && currentUser?.rol === ROLES.CAPTURISTA){
    mesSel.disabled = true; mesSel.classList.add("disabled-by-role");
  }
}

function llenarSelectorAreas(){
  // Todos los roles ven TODAS las áreas
  const opciones = [{valor:"", texto:"Seleccionar..."}, ...Object.entries(AREAS).map(([k,v])=>({valor:k, texto:v}))];
  llenarSelect("#fArea", opciones);
}

function llenarSelectorIndicadores(area){
  const sel = $("#fIndicador"); if (!sel) return;
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
  const area = $("#fArea").value;
  capturaData.selectedArea = area || null;
  log("Cambio de área", { area });

  llenarSelectorIndicadores(area);
  limpiarDatos();
  const indicador = $("#fIndicador")?.value;
  if (area && indicador) cargarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioIndicador(){
  capturaData.selectedIndicador = $("#fIndicador").value || null;
  if (capturaData.selectedIndicador && capturaData.selectedArea) cargarDatos();
  else limpiarDatos();
  actualizarEstadoBotonGuardar();
}

function manejarCambioAnio(){
  // Capturista: siempre forzar año actual en UI/estado
  if (currentUser?.rol === ROLES.CAPTURISTA) {
    $("#fAnio").value = String(ANO_ACTUAL);
    capturaData.currentYear = ANO_ACTUAL;
  } else {
    capturaData.currentYear = parseInt($("#fAnio").value) || ANO_ACTUAL;
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
  if (currentUser?.rol === ROLES.CAPTURISTA) {
    anio = ANO_ACTUAL;
    const anioSel = $("#fAnio"); if (anioSel) anioSel.value = String(ANO_ACTUAL);
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
    const tbody = $("#tbodyCaptura"); 
    if (!tbody) {
        console.warn('Tabla de captura no encontrada');
        return;
    }
    
    tbody.innerHTML = "";
    
    for (let mes=1; mes<=12; mes++){
        const d = datos.find(x=>x.mes===mes) || {};
        const tr = document.createElement("tr");

        let cumplimiento = "-"; 
        let clase = "";
        if (d.cumplimiento===0 || d.cumplimiento){ 
            cumplimiento = formatearPorcentaje(d.cumplimiento);
            clase = d.cumplimiento >= 100 ? "text-green-600 font-semibold"
                 : d.cumplimiento >= 80 ? "text-yellow-600 font-medium"
                 : "text-red-600";
        }
        
        const val  = (d.valor===0 || d.valor) ? formatearNumero(d.valor) : "";
        const meta = (d.meta===0  || d.meta)  ? formatearNumero(d.meta)  : "";

        // Botón de edición
        let accionesHtml = '';
        if (d.valor || d.valor === 0) { // Si hay datos capturados
            accionesHtml = `
                <button 
                    onclick="editarMes(${mes}, ${d.valor || 0})" 
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    title="Editar ${MESES[mes-1]}"
                >
                    ✏️ Editar
                </button>
            `;
        } else {
            accionesHtml = '<span class="text-gray-400 text-xs">Sin datos</span>';
        }

        tr.innerHTML = `
            <td class="border border-gray-300 px-4 py-2 font-medium">${MESES[mes-1]}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${val}</td>
            <td class="border border-gray-300 px-4 py-2 text-right">${meta}</td>
            <td class="border border-gray-300 px-4 py-2 text-right ${clase}">${cumplimiento}</td>
            <td class="border border-gray-300 px-2 py-2 text-center">${accionesHtml}</td>
        `;
        
        // Resaltar mes actual
        if (mes === capturaData.currentMonth && capturaData.currentYear === ANO_ACTUAL){
            tr.classList.add("bg-blue-50");
        }
        
        tbody.appendChild(tr);
    }
    
    console.log('Tabla actualizada con', datos.length, 'registros');
}

// ====================================
// Form y guardado
// ====================================
function validarMesesConsecutivos(mesSeleccionado) {
    // Solo aplicar validación si hay datos cargados
    if (!capturaData.datosActuales || capturaData.datosActuales.length === 0) {
        return { valido: true }; // Si no hay datos, permitir cualquier mes
    }

    // Obtener meses que ya tienen datos
    const mesesConDatos = capturaData.datosActuales
        .filter(d => d.valor !== null && d.valor !== undefined)
        .map(d => d.mes)
        .sort((a, b) => a - b);

    console.log('Meses con datos:', mesesConDatos);
    console.log('Mes seleccionado:', mesSeleccionado);

    // Si no hay meses capturados, permitir cualquier mes
    if (mesesConDatos.length === 0) {
        return { valido: true };
    }

    // Si el mes ya está capturado, no validar consecutivo (se maneja en PARTE 3)
    if (mesesConDatos.includes(mesSeleccionado)) {
        return { valido: true }; // Permitir, pero PARTE 3 mostrará opción de editar
    }

    // Obtener el último mes capturado
    const ultimoMesCapturado = Math.max(...mesesConDatos);
    
    // Validar que el nuevo mes sea consecutivo
    const mesEsperado = ultimoMesCapturado + 1;
    
    if (mesSeleccionado === mesEsperado || mesSeleccionado <= ultimoMesCapturado) {
        return { valido: true };
    } else {
        return { 
            valido: false, 
            mensaje: `Debe capturar los meses consecutivamente. El siguiente mes a capturar es ${MESES[mesEsperado - 1]} (${mesEsperado}).`,
            mesEsperado: mesEsperado
        };
    }
}

function validarFormulario(){
    const area = $("#fArea")?.value;
    const indicador = $("#fIndicador")?.value;
    const anio = parseInt($("#fAnio")?.value);
    const mes = parseInt($("#fMes")?.value);

    if (!area || !indicador || !anio || !mes){
        mostrarNotificacion("Seleccione área, indicador, año y mes", "error"); 
        return false;
    }

      // Validar meses consecutivos
    const validacionConsecutiva = validarMesesConsecutivos(mes);
    if (!validacionConsecutiva.valido) {
        mostrarNotificacion(validacionConsecutiva.mensaje, "warning");
        return false;
    }

      // Verificar si el mes ya está capturado
    const mesYaCapturado = capturaData.datosActuales.find(d => 
        d.mes === mes && (d.valor !== null && d.valor !== undefined)
    );
    
    if (mesYaCapturado) {
        const nombreMes = MESES[mes - 1];
        const valorActual = formatearNumero(mesYaCapturado.valor);

        mostrarNotificacion(
            `${nombreMes} ya está capturado con valor: ${valorActual}. Use el botón "Editar" en la tabla para modificarlo.`,
            "info"
        );

        return false;
    }
      
    // Validación específica para CAPTURISTA
    if (currentUser?.rol === ROLES.CAPTURISTA) {
        // Solo puede capturar el año actual
        if (anio !== ANO_ACTUAL){
            mostrarNotificacion(`Los capturistas solo pueden capturar el año ${ANO_ACTUAL}`, "error"); 
            return false;
        }
        
        // Solo puede capturar el mes vigente
        if (mes !== capturaData.currentMonth){
            const mesTxt = MESES[capturaData.currentMonth-1];
            mostrarNotificacion(`Los capturistas solo pueden capturar el mes vigente (${mesTxt})`, "error"); 
            return false;
        }
        
        // Verificar que el área coincida con su área asignada
        if (currentUser.area && currentUser.area !== 'operaciones' && area !== currentUser.area) {
            mostrarNotificacion(`Solo puede capturar en su área asignada: ${currentUser.area}`, "error");
            return false;
        }
    }

    // Validación de valores numéricos
    const valor = limpiarNumero($("#fValor")?.value);
    //const meta = limpiarNumero($("#fMeta")?.value);
    
    if (valor === null || isNaN(valor) || valor < 0) { 
        mostrarNotificacion("Ingrese un valor válido (mayor o igual a 0)", "error"); 
        return false; 
    }
    /*
    if (meta === null || isNaN(meta) || meta < 0) { 
        mostrarNotificacion("Ingrese una meta válida (mayor o igual a 0)", "error"); 
        return false; 
    }*/
    
    // Validación de rangos
    if (valor > VALIDACIONES.VALOR_MAXIMO){
        mostrarNotificacion(`El valor no puede ser mayor a ${formatearNumero(VALIDACIONES.VALOR_MAXIMO)}`, "error"); 
        return false;
    }
    /*
    if (meta > VALIDACIONES.VALOR_MAXIMO){
        mostrarNotificacion(`La meta no puede ser mayor a ${formatearNumero(VALIDACIONES.VALOR_MAXIMO)}`, "error"); 
        return false;
    }*/
    
    return true;
}

async function guardarMedicion(){

      if (!validarFormulario()){ 
        actualizarEstadoBotonGuardar(); 
        return; 
    }

    const area = $("#fArea").value;
    const indicador = $("#fIndicador").value;
    const anio = (currentUser?.rol === ROLES.CAPTURISTA) ? ANO_ACTUAL : (parseInt($("#fAnio").value) || ANO_ACTUAL);
    const mes = (currentUser?.rol === ROLES.CAPTURISTA) ? capturaData.currentMonth : parseInt($("#fMes").value);
    let valor = limpiarNumero($("#fValor").value) || 0;
    //let meta = limpiarNumero($("#fMeta").value) || 0;

    // Validación adicional desde auth.js si existe
    if (window.authSystem && typeof authSystem.validarOperacionEscritura === "function"){
        const ok = authSystem.validarOperacionEscritura("upsert_medicion", { area, anio, mes });
        if (!ok) return;
    }

    const btn = document.querySelector('button[onclick="guardarMedicion()"]');
    
    try {
        mostrarCargando(btn, true);
        
        // Preparar datos para inserción/actualización
        const datosGuardar = {
            area: area,
            indicador: indicador,
            anio: anio,
            mes: mes,
            valor: valor,
            //meta: meta,
            //created_by: currentUser?.username || 'sistema'
            //updated_at: new Date().toISOString()
        };
        
        console.log('Guardando datos:', datosGuardar);
        
        // Usar UPSERT para insertar o actualizar si ya existe
           const { data, error } = await sb
          .from("medicion")
          .upsert(datosGuardar);
        if (error) { 
            console.error('Error de Supabase:', error);
            mostrarNotificacion(`${MENSAJES.ERROR_GUARDAR}: ${error.message}`, "error"); 
            return; 
        }
        
        console.log('Datos guardados exitosamente:', data);
        mostrarNotificacion(MENSAJES.EXITO_GUARDAR, "success");
        
        // Limpiar campos después del guardado exitoso
        limpiarCampos();
        
        // Recargar datos para mostrar la actualización
        setTimeout(async () => {
            await cargarDatos();
        }, 500);
        
    } catch(err) {
        console.error('Error inesperado:', err);
        mostrarNotificacion("Error inesperado al guardar: " + err.message, "error");
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

  // Solo capturista está restringido por mes/año vigente
  if (currentUser?.rol === ROLES.CAPTURISTA) {
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
  const indSel = $("#fIndicador"); if (indSel) indSel.innerHTML = '<option value="">Seleccionar...</option>';
  limpiarCampos();
  limpiarDatos();
  actualizarEstadoBotonGuardar();
}

  function resaltarFilaMes(mes) {
    // Remover resaltados previos
    const todasLasFilas = document.querySelectorAll('#tbodyCaptura tr');
    todasLasFilas.forEach(fila => {
        fila.classList.remove('bg-red-100', 'animate-pulse');
    });
    
    // Resaltar la fila del mes específico (mes - 1 porque es índice 0)
    setTimeout(() => {
        const filaTarget = document.querySelector(`#tbodyCaptura tr:nth-child(${mes})`);
        if (filaTarget) {
            filaTarget.classList.add('bg-red-100', 'animate-pulse');
            
            // Scroll hacia la fila
            filaTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Quitar resaltado después de 3 segundos
            setTimeout(() => {
                filaTarget.classList.remove('bg-red-100', 'animate-pulse');
            }, 3000);
        }
    }, 100);
}

  function editarMes(mes, valorActual) {
    const nombreMes = MESES[mes - 1];
    const confirmar = confirm(`¿Desea editar los datos de ${nombreMes}?\n\nValor actual: ${formatearNumero(valorActual)}`);
    
    if (confirmar) {
        // Precargar el formulario con los datos existentes
        $("#fMes").value = mes;
        $("#fValor").value = valorActual;
        
        // Scroll hacia el formulario
        document.getElementById('moduloCaptura').scrollIntoView({ behavior: 'smooth' });
        
        // Focus en el campo valor
        setTimeout(() => {
            $("#fValor").focus();
            $("#fValor").select(); // Seleccionar todo el texto
        }, 500);
        
        mostrarNotificacion(`Editando datos de ${nombreMes}. Modifique el valor y presione Guardar.`, "info");
    }
}
  

function limpiarCampos(){
    const valorInput = $("#fValor"); 
    const metaInput = $("#fMeta");
    
    if (valorInput){ 
        valorInput.value = ""; 
        valorInput.classList.remove("border-red-500"); 
    }
    
    if (metaInput){ 
        metaInput.value = ""; 
        metaInput.classList.remove("border-red-500"); 
    }
    
    // Opcional: Mostrar mensaje de confirmación
    console.log('Campos limpiados después del guardado exitoso');
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
