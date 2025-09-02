// ====================================
// ARCHIVO 4: charts.js
// Funciones específicas para gráficas
// ====================================

/**
 * Configuraciones base para diferentes tipos de gráficas
 */
const CHART_CONFIGS = {
    captura: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y;
                        if (valor === null || valor === undefined) return null;
                        return `${context.dataset.label}: ${formatearNumero(valor)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatearNumero(value);
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 4,
                hoverRadius: 6,
                borderWidth: 2
            },
            line: {
                borderWidth: 3,
                tension: 0.1
            }
        }
    },
    visualizacion: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y;
                        if (valor === null || valor === undefined) return null;
                        return `${context.dataset.label}: ${formatearNumero(valor)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatearNumero(value);
                    }
                },
                title: {
                    display: true,
                    text: 'Valores'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Meses'
                }
            }
        },
        elements: {
            point: {
                radius: 5,
                hoverRadius: 7,
                borderWidth: 2
            },
            line: {
                borderWidth: 3,
                tension: 0.1
            }
        }
    }
};

/**
 * Crear gráfica para el módulo de captura
 */
async function crearGraficaCaptura(area, indicador) {
    const anio = parseInt($('#fAnio').value);
    if (!area || !indicador || !anio) return;

    try {
        // Obtener datos de los últimos 4 años incluyendo el año actual
        const years = [];
        for (let i = 3; i >= 0; i--) {
            years.push(anio - i);
        }

        log('Cargando datos para gráfica de captura', { area, indicador, years });

        const { data, error } = await sb
            .from('v_medicion')
            .select('anio, mes, valor')
            .eq('area', area)
            .eq('indicador', indicador)
            .in('anio', years)
            .order('anio')
            .order('mes');

        if (error) {
            logError('Error cargando datos del gráfico de captura', error);
            mostrarNotificacion('Error al cargar datos de la gráfica', 'error');
            return;
        }

        // Preparar datasets por año
        const datasets = years.map(year => {
            const yearData = crearArrayMeses(null);
            data.filter(d => d.anio === year).forEach(d => {
                yearData[d.mes - 1] = d.valor;
            });

            return {
                label: year.toString(),
                data: yearData,
                borderColor: obtenerColorPorAnio(year),
                backgroundColor: obtenerColorConTransparencia(obtenerColorPorAnio(year), 0.1),
                fill: false,
                tension: 0.1
            };
        });

        // Crear o actualizar gráfica
        const ctx = $('#chartCaptura');
        if (!ctx) {
            logError('Canvas de captura no encontrado');
            return;
        }

        // Destruir gráfica anterior
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }

        // Configuración específica para la gráfica
        const config = { ...CHART_CONFIGS.captura };
        config.plugins.title = {
            display: true,
            text: `${AREAS[area]} - ${INDICADORES[indicador]}`,
            font: {
                size: 16,
                weight: 'bold'
            }
        };

        // Actualizar etiqueta del eje Y según el indicador
        if (indicador === 'toneladas') {
            config.scales.y.title = {
                display: true,
                text: 'Toneladas'
            };
        } else if (indicador === 'pasajeros') {
            config.scales.y.title = {
                display: true,
                text: 'Número de Pasajeros'
            };
        } else {
            config.scales.y.title = {
                display: true,
                text: 'Número de Operaciones'
            };
        }

        currentChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: MESES,
                datasets: datasets
            },
            options: config
        });

        log('Gráfica de captura creada exitosamente');

    } catch (error) {
        logError('Error al crear gráfica de captura', error);
        mostrarNotificacion('Error al crear la gráfica', 'error');
    }
}

/**
 * Crear gráfica para el módulo de visualización (histórica completa)
 */
async function crearGraficaVisualizacion(area, indicador, tipo) {
    try {
        log('Cargando datos históricos completos para gráfica', { area, indicador });

        // Obtener TODOS los datos históricos para la gráfica
        const { data, error } = await sb
            .from('v_medicion')
            .select('anio, mes, valor')
            .eq('area', area)
            .eq('indicador', indicador)
            .gte('anio', ANO_INICIAL) // Desde 2022
            .order('anio')
            .order('mes');

        if (error) {
            logError('Error cargando datos históricos', error);
            mostrarNotificacion('Error al cargar datos históricos', 'error');
            return;
        }

        if (!data || data.length === 0) {
            mostrarNotificacion('No hay datos históricos para mostrar', 'warning');
            return;
        }

        // Obtener todos los años únicos
        const aniosUnicos = obtenerAniosUnicos(data);
        
        // Crear datasets para cada año
        const datasets = aniosUnicos.map(anio => {
            const yearData = crearArrayMeses(null);
            data.filter(d => d.anio === anio).forEach(d => {
                yearData[d.mes - 1] = d.valor;
            });

            return {
                label: anio.toString(),
                data: yearData,
                borderColor: obtenerColorPorAnio(anio),
                backgroundColor: obtenerColorConTransparencia(obtenerColorPorAnio(anio), 0.1),
                fill: false,
                tension: 0.1,
                pointBackgroundColor: obtenerColorPorAnio(anio),
                pointBorderColor: obtenerColorPorAnio(anio)
            };
        });

        // Crear o actualizar gráfica
        const ctx = $('#vChart');
        if (!ctx) {
            logError('Canvas de visualización no encontrado');
            return;
        }

        // Destruir gráfica anterior
        if (visualChart) {
            visualChart.destroy();
            visualChart = null;
        }

        // Configuración específica para la gráfica
        const config = { ...CHART_CONFIGS.visualizacion };
        
        // Título dinámico
        let chartTitle = '';
        if (vContext.modo === 'pasajeros') {
            chartTitle = `${tipo === 'comercial' ? 'Aviación Comercial' : 'Aviación General'} - Pasajeros`;
        } else if (vContext.modo === 'operaciones') {
            chartTitle = `${tipo === 'comercial' ? 'Aviación Comercial' : 'Aviación General'} - Operaciones`;
        } else {
            chartTitle = `Aviación de Carga - ${tipo === 'operaciones' ? 'Operaciones' : 'Toneladas'}`;
        }

        config.plugins.title = {
            display: true,
            text: `${chartTitle} (Histórico ${ANO_INICIAL}-${ANO_ACTUAL})`,
            font: {
                size: 16,
                weight: 'bold'
            }
        };

        // Actualizar etiqueta del eje Y según el contexto
        if (vContext.modo === 'carga' && tipo === 'toneladas') {
            config.scales.y.title.text = 'Toneladas';
        } else if (vContext.modo === 'pasajeros') {
            config.scales.y.title.text = 'Número de Pasajeros';
        } else {
            config.scales.y.title.text = 'Número de Operaciones';
        }

        visualChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: MESES,
                datasets: datasets
            },
            options: config
        });

        log('Gráfica de visualización creada exitosamente', { aniosIncluidos: aniosUnicos });

    } catch (error) {
        logError('Error al crear gráfica de visualización', error);
        mostrarNotificacion('Error al crear la gráfica histórica', 'error');
    }
}

/**
 * Destruir gráficas existentes
 */
function destruirGraficas() {
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    if (visualChart) {
        visualChart.destroy();
        visualChart = null;
    }
}

/**
 * Redimensionar gráficas
 */
function redimensionarGraficas() {
    if (currentChart) {
        currentChart.resize();
    }
    
    if (visualChart) {
        visualChart.resize();
    }
}

/**
 * Actualizar datos de una gráfica existente
 */
function actualizarDatosGrafica(grafica, nuevosDatasets) {
    if (!grafica) return;
    
    grafica.data.datasets = nuevosDatasets;
    grafica.update();
}

/**
 * Exportar gráfica como imagen
 */
function exportarGraficaComoImagen(grafica, nombreArchivo) {
    if (!grafica) return;
    
    try {
        const canvas = grafica.canvas;
        const url = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `${nombreArchivo}_${obtenerFechaFormateada()}.png`;
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarNotificacion('Gráfica exportada correctamente', 'success');
    } catch (error) {
        logError('Error al exportar gráfica', error);
        mostrarNotificacion('Error al exportar la gráfica', 'error');
    }
}

/**
 * Configurar eventos de redimensionamiento
 */
function configurarEventosGraficas() {
    // Redimensionar gráficas cuando cambie el tamaño de la ventana
    window.addEventListener('resize', function() {
        setTimeout(redimensionarGraficas, 300);
    });
    
    // Configurar eventos de exportación si existen los botones
    const btnExportCaptura = $('#btnExportCaptura');
    if (btnExportCaptura) {
        btnExportCaptura.addEventListener('click', function() {
            exportarGraficaComoImagen(currentChart, 'grafica_captura');
        });
    }
    
    const btnExportVisualizacion = $('#btnExportVisualizacion');
    if (btnExportVisualizacion) {
        btnExportVisualizacion.addEventListener('click', function() {
            exportarGraficaComoImagen(visualChart, 'grafica_visualizacion');
        });
    }
}

/**
 * Verificar disponibilidad de Chart.js
 */
function verificarChart() {
    if (typeof Chart === 'undefined') {
        logError('Chart.js no está disponible');
        mostrarNotificacion('Error: Librería de gráficas no disponible', 'error');
        return false;
    }
    return true;
}

/**
 * Inicializar módulo de gráficas
 */
function inicializarGraficas() {
    if (!verificarChart()) return;
    
    log('Inicializando módulo de gráficas');
    configurarEventosGraficas();
    
    // Configurar Chart.js globalmente
    Chart.defaults.font.family = "'Inter', 'system-ui', 'sans-serif'";
    Chart.defaults.color = '#374151';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

/**
 * Limpiar todas las gráficas al cambiar de módulo
 */
function limpiarGraficasAlCambiarModulo() {
    destruirGraficas();
    log('Gráficas limpiadas al cambiar de módulo');
}

// Inicializar cuando se carga el archivo
document.addEventListener('DOMContentLoaded', function() {
    inicializarGraficas();
});
