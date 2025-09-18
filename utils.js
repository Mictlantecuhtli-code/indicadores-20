// ====================================
// ARCHIVO 3: utils.js
// Funciones auxiliares y utilidades
// ====================================

// Funciones auxiliares para DOM
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/**
 * Funciones de formato y validación
 */
function formatearNumero(numero, decimales = 0) {
    if (numero === null || numero === undefined || numero === '') return '';
    return new Intl.NumberFormat(FORMATO_NUMEROS.locale, {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(numero);
}

function formatearPorcentaje(porcentaje) {
    if (porcentaje === null || porcentaje === undefined) return '-';
    return `${Number(porcentaje).toFixed(1)}%`;
}

function validarNumero(valor, minimo = VALIDACIONES.VALOR_MINIMO, maximo = VALIDACIONES.VALOR_MAXIMO) {
    const num = parseFloat(valor);
    return !isNaN(num) && num >= minimo && num <= maximo;
}

function limpiarNumero(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    
    // Remover comas y caracteres no numéricos excepto punto decimal y signo negativo
    const limpio = String(valor).replace(/[^-\d.]/g, '');
    const numero = parseFloat(limpio);
    
    return isNaN(numero) ? null : numero;
}

/**
 * Funciones de fecha y tiempo
 */
function obtenerAnioActual() {
    return new Date().getFullYear();
}

function obtenerMesActual() {
    return new Date().getMonth() + 1;
}

function obtenerFechaFormateada(fecha = new Date()) {
    return fecha.toISOString().split('T')[0];
}

function obtenerNombreMes(numeroMes) {
    return MESES[numeroMes - 1] || '';
}

function obtenerNumeroMes(nombreMes) {
    return MESES.indexOf(nombreMes) + 1;
}

/**
 * Funciones de color para gráficas
 */
function obtenerColorPorAnio(anio) {
    return COLORES_GRAFICAS[anio % COLORES_GRAFICAS.length];
}

function obtenerColorConTransparencia(color, transparencia = 0.2) {
    return color + Math.floor(transparencia * 255).toString(16).padStart(2, '0');
}

/**
 * Funciones de manipulación de arrays y objetos
 */
function crearArrayMeses(valorPorDefecto = null) {
    return Array(12).fill(valorPorDefecto);
}

function agruparPorAnio(datos) {
    return datos.reduce((acc, item) => {
        if (!acc[item.anio]) {
            acc[item.anio] = [];
        }
        acc[item.anio].push(item);
        return acc;
    }, {});
}

function obtenerAniosUnicos(datos) {
    return [...new Set(datos.map(item => item.anio))].sort();
}

function crearPivotMeses(datos, anios) {
    return MESES.map((mes, index) => {
        const fila = { mes: mes, mesNumero: index + 1 };
        anios.forEach(anio => {
            const dato = datos.find(d => d.anio === anio && d.mes === index + 1);
            fila[`valor_${anio}`] = dato?.valor || null;
            fila[`meta_${anio}`] = dato?.meta || null;
            fila[`cumplimiento_${anio}`] = dato?.cumplimiento || null;
        });
        return fila;
    });
}

/**
 * Funciones de descarga de archivos
 */
function descargarCSV(datos, nombreArchivo) {
    try {
        const csv = convertirACSV(datos);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${nombreArchivo}_${obtenerFechaFormateada()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarNotificacion(MENSAJES.DESCARGA_INICIADA, 'success');
    } catch (error) {
        console.error('Error al descargar CSV:', error);
        mostrarNotificacion(MENSAJES.DESCARGA_ERROR, 'error');
    }
}

function convertirACSV(datos) {
    if (!datos || datos.length === 0) return '';
    
    const encabezados = Object.keys(datos[0]);
    const filas = datos.map(fila => 
        encabezados.map(campo => {
            let valor = fila[campo];
            if (valor === null || valor === undefined) valor = '';
            return `"${valor.toString().replace(/"/g, '""')}"`;
        }).join(DOWNLOAD_CONFIG.csvSeparator)
    );
    
    return [
        encabezados.map(h => `"${h}"`).join(DOWNLOAD_CONFIG.csvSeparator),
        ...filas
    ].join('\n');
}

/**
 * Funciones de notificación y UI
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3000) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    
    // Aplicar estilos según el tipo
    switch (tipo) {
        case 'success':
            notificacion.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notificacion.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            notificacion.classList.add('bg-yellow-500', 'text-white');
            break;
        default:
            notificacion.classList.add('bg-blue-500', 'text-white');
    }
    
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.classList.remove('translate-x-full');
    }, 100);
    
    // Remover después del tiempo especificado
    setTimeout(() => {
        notificacion.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                document.body.removeChild(notificacion);
            }
        }, 300);
    }, duracion);
}

function mostrarCargando(elemento, mostrar = true) {
    if (!elemento) {
        console.warn('Elemento no encontrado para mostrarCargando');
        return;
    }
    
    if (mostrar) {
        // Guardar el texto original
        if (!elemento.dataset.originalText) {
            elemento.dataset.originalText = elemento.innerHTML;
        }
        elemento.disabled = true;
        elemento.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Guardando...';
    } else {
        elemento.disabled = false;
        // Restaurar texto original
        if (elemento.dataset.originalText) {
            elemento.innerHTML = elemento.dataset.originalText;
        } else {
            elemento.innerHTML = 'Guardar'; // fallback
        }
    }
}

function limpiarFormulario(formularioId) {
    const formulario = $(formularioId);
    if (formulario) {
        const inputs = formulario.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }
}

/**
 * Funciones de validación de formularios
 */
function validarFormularioCaptura() {
    const area = $('#fArea').value;
    const indicador = $('#fIndicador').value;
    const anio = $('#fAnio').value;
    const mes = $('#fMes').value;
    
    if (!area || !indicador || !anio || !mes) {
        mostrarNotificacion(MENSAJES.ERROR_CAMPOS_VACIOS, 'error');
        return false;
    }
    
    const valor = $('#fValor').value;
    const meta = $('#fMeta').value;
    
    if (valor && !validarNumero(valor)) {
        mostrarNotificacion('El valor ingresado no es válido', 'error');
        return false;
    }
    
    if (meta && !validarNumero(meta)) {
        mostrarNotificacion('La meta ingresada no es válida', 'error');
        return false;
    }
    
    return true;
}

function validarFiltrosVisualizacion() {
    const anio = $('#vAnio').value;
    const tipo = $('#vTipo').value;
    
    if (!anio) {
        mostrarNotificacion(MENSAJES.ERROR_SELECCIONAR_ANO, 'error');
        return false;
    }
    
    if (!tipo) {
        mostrarNotificacion(MENSAJES.ERROR_SELECCIONAR_TIPO, 'error');
        return false;
    }
    
    return true;
}

/**
 * Funciones de manipulación de elementos DOM
 */
function llenarSelect(selectId, opciones, valorSeleccionado = null) {
    const select = $(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    
    opciones.forEach(opcion => {
        const option = document.createElement('option');
        option.value = opcion.valor;
        option.textContent = opcion.texto;
        if (valorSeleccionado && opcion.valor == valorSeleccionado) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function obtenerValoresFormulario(formularioId) {
    const formulario = $(formularioId);
    if (!formulario) return {};
    
    const datos = {};
    const elementos = formulario.querySelectorAll('input, select, textarea');
    
    elementos.forEach(elemento => {
        if (elemento.id) {
            datos[elemento.id] = elemento.value;
        }
    });
    
    return datos;
}

/**
 * Funciones de debug y logging
 */
function log(mensaje, datos = null) {
    if (typeof console !== 'undefined') {
        if (datos) {
            console.log(`[AVIACIÓN] ${mensaje}:`, datos);
        } else {
            console.log(`[AVIACIÓN] ${mensaje}`);
        }
    }
}

function logError(mensaje, error = null) {
    if (typeof console !== 'undefined') {
        if (error) {
            console.error(`[AVIACIÓN ERROR] ${mensaje}:`, error);
        } else {
            console.error(`[AVIACIÓN ERROR] ${mensaje}`);
        }
    }
}

/**
 * Funciones de almacenamiento local (opcional)
 */
function guardarEnCache(clave, datos, tiempoExpiracion = 3600000) { // 1 hora por defecto
    const item = {
        datos: datos,
        timestamp: Date.now(),
        expiracion: tiempoExpiracion
    };
    
    try {
        localStorage.setItem(`aviacion_${clave}`, JSON.stringify(item));
    } catch (error) {
        logError('Error al guardar en cache', error);
    }
}

function obtenerDeCache(clave) {
    try {
        const item = JSON.parse(localStorage.getItem(`aviacion_${clave}`));
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.expiracion) {
            localStorage.removeItem(`aviacion_${clave}`);
            return null;
        }
        
        return item.datos;
    } catch (error) {
        logError('Error al obtener de cache', error);
        return null;
    }
}

function limpiarCache() {
    try {
        Object.keys(localStorage).forEach(clave => {
            if (clave.startsWith('aviacion_')) {
                localStorage.removeItem(clave);
            }
        });
    } catch (error) {
        logError('Error al limpiar cache', error);
    }
}
