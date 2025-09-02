// ====================================
// ARCHIVO 4: charts.js (CORREGIDO)
// Funciones específicas para gráficas
// ====================================

/**
 * Configuraciones base para diferentes tipos de gráficas
 */
const CHART_CONFIGS = {
    captura: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
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
        maintainAspectRatio: true,
        aspectRatio: 2.2,
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

        const ctx = $('#chartCaptura');
        if (!ctx) {
            logError('Canvas de captura no encontrado');
            return;
        }

        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }

        const config = { ...CHART_CONFIGS.captura };
        config.plugins.title = {
            display: true,
            text: `${AREAS[area]} - ${INDICADORES[indicador]}`,
            font: {
                size: 16,
                weight: 'bold'
            }
        };

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
 * Crear gráfica histórica completa
 */
async function crearGraficaVisualizacion(area, indicador, tipo) {
    try {
        log('Cargando datos históricos completos para gráfica', { area, indicador });

        const { data, error } = await sb
            .from('v_medicion')
            .select('anio, mes, valor')
            .eq('area', area)
            .eq('indicador', indicador)
            .gte('anio', ANO_INICIAL)
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

        const aniosUnicos = obtenerAniosUnicos(data);
        
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

        const ctx = $('#vChart');
        if (!ctx) {
            logError('Canvas de visualización no encontrado');
            return;
        }

        if (visualChart) {
            visualChart.destroy();
            visualChart = null;
        }

        const config = { ...CHART_CONFIGS.visualizacion };
        
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
 * Crear gráfica comparativa (solo 2 años)
 */
async function crearGraficaComparativa(area, indicador, tipo) {
    const anioActual = visualizacionData.anioSeleccionado;
    let anioComparacion;
    
    if (visualizacionData.comparacionSeleccionada === 'anterior') {
        anioComparacion = anioActual - 1;
    } else {
        anioComparacion = parseInt(visualizacionData.comparacionSeleccionada);
    }
    
    const mostrarHistorico = $('#chkMostrarHistorico')?.checked || false;
    
    if (mostrarHistorico) {
        await crearGraficaVisualizacion(area, indicador, tipo);
        return;
    }
    
    try {
        log('Cargando datos comparativos', { anioActual, anioComparacion, area, indicador });

        const { data, error } = await sb
            .from('v_medicion')
            .select('anio, mes, valor')
            .eq('area', area)
            .eq('indicador', indicador)
            .in('anio', [anioActual, anioComparacion])
            .order('anio')
            .order('mes');

        if (error) {
            logError('Error cargando datos comparativos', error);
            mostrarNotificacion('Error al cargar datos comparativos', 'error');
            return;
        }

        const datasets = [anioComparacion, anioActual].map(anio => {
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

        const ctx = $('#vChart');
        if (!ctx) {
            logError('Canvas de visualización no encontrado');
            return;
        }

        if (visualChart) {
            visualChart.destroy();
            visualChart = null;
        }

        const config = { ...CHART_CONFIGS.visualizacion };
        
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
            text: `${chartTitle} - Comparativo ${anioActual} vs ${anioComparacion}`,
            font: { size: 16, weight: 'bold' }
        };

        if (vContext.modo === 'carga' && tipo === 'toneladas') {
            config.scales.y.title.text = 'Toneladas';
        } else if (vContext.modo === 'pasajeros') {
            config.scales.y.title.text = 'Número de Pasajeros';
        } else {
            config.scales.y.title.text = 'Número de Operaciones';
        }

        visualChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels: MESES, datasets: datasets },
            options: config
        });

        log('Gráfica comparativa creada exitosamente', { años: [anioComparacion, anioActual] });

    } catch (error) {
        logError('Error en gráfica comparativa', error);
        mostrarNotificacion('Error al crear la gráfica comparativa', 'error');
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
 * Configurar eventos de redimensionamiento
 */
function configurarEventosGraficas() {
    window.addEventListener('resize', function() {
        setTimeout(redimensionarGraficas, 300);
    });
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
