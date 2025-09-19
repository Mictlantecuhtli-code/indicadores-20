// ====================================
// ARCHIVO 4: charts.js (CON FUNCIÓN COMPARATIVA)
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
 * Crear gráfica histórica completa (para el checkbox)
 */
async function crearGraficaVisualizacion(area, indicador, tipo) {
    try {
        log('Cargando datos históricos COMPLETOS', { area, indicador });

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
            text: `${chartTitle} - HISTÓRICO COMPLETO (${ANO_INICIAL}-${ANO_ACTUAL})`,
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

        log('Gráfica histórica COMPLETA creada exitosamente', { aniosIncluidos: aniosUnicos });

    } catch (error) {
        logError('Error al crear gráfica histórica', error);
        mostrarNotificacion('Error al crear la gráfica histórica', 'error');
    }
}
/**
 * Crear gráfica Meta
 */
    function crearGraficaMeta() {
        const ctx = $('#chartMeta');
        if (!ctx) {
            console.error('Canvas de meta no encontrado');
            return;
        }
    
        // Destruir gráfica existente si hay una
        if (window.chartMetaInstance) {
            window.chartMetaInstance.destroy();
        }
    
        const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        const dataReal = [];
        const dataMeta = [];
        
        for (let mes = 1; mes <= 12; mes++) {
            const datoReal = analisisState.datos2025.find(d => d.mes === mes);
            const datoMeta = analisisState.datosMetas.find(d => d.mes === mes);
            
            dataReal.push(datoReal?.valor || null);
            dataMeta.push(datoMeta?.meta || null);
        }
    
        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Real 2025',
                        data: dataReal,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.1,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#3B82F6',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: `Meta ${analisisState.escenario.charAt(0).toUpperCase() + analisisState.escenario.slice(1)}`,
                        data: dataMeta,
                        borderColor: obtenerColorEscenario(analisisState.escenario),
                        backgroundColor: `${obtenerColorEscenario(analisisState.escenario)}20`,
                        borderWidth: 3,
                        borderDash: [10, 5],
                        tension: 0.1,
                        pointBackgroundColor: obtenerColorEscenario(analisisState.escenario),
                        pointBorderColor: obtenerColorEscenario(analisisState.escenario),
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Real vs Meta Escenario ${analisisState.escenario.charAt(0).toUpperCase() + analisisState.escenario.slice(1)} - 2025`,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { 
                            usePointStyle: true, 
                            padding: 15,
                            font: { size: 12 }
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
                            },
                            afterLabel: function(context) {
                                // Mostrar % cumplimiento en tooltip
                                if (context.datasetIndex === 0 && context.parsed.y !== null) {
                                    const mes = context.dataIndex + 1;
                                    const datoMeta = analisisState.datosMetas.find(d => d.mes === mes);
                                    if (datoMeta?.meta) {
                                        const cumplimiento = (context.parsed.y / datoMeta.meta * 100).toFixed(1);
                                        return `Cumplimiento: ${cumplimiento}%`;
                                    }
                                }
                                return null;
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
                            text: obtenerNombreIndicador() // Esta función ya existe en analisis_general.html
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Meses 2025'
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
    
        window.chartMetaInstance = new Chart(ctx.getContext('2d'), config);
        
        console.log('Gráfica de meta creada exitosamente');
    }

/**
 * Crear gráfica trimestral (SOLO 2 AÑOS)
 */
function crearGraficaTrimestral(trimestres) {
   /* const ctx = $('#chartTrimestral');
    if (!ctx) {
        console.error('Canvas trimestral no encontrado');
        return;
    } */

                // Validar que hay trimestres para mostrar
            if (!trimestres || Object.keys(trimestres).length === 0) {
                console.log('No hay trimestres completos para mostrar gráfica');
                const ctx = $('#chartTrimestral');
                if (ctx) {
                    // Ocultar el canvas y mostrar mensaje
                    ctx.style.display = 'none';
                    let mensaje = ctx.parentNode.querySelector('.no-data-message');
                    if (!mensaje) {
                        mensaje = document.createElement('div');
                        mensaje.className = 'no-data-message text-center text-gray-500 py-8';
                        mensaje.innerHTML = `
                            <p class="text-lg mb-2">📊</p>
                            <p>No hay trimestres completos para mostrar gráfica</p>
                            <p class="text-sm mt-1">Se requieren los 3 meses de cada trimestre con datos</p>
                        `;
                        ctx.parentNode.appendChild(mensaje);
                    }
                }
                return;
            }
            
            const ctx = $('#chartTrimestral');
            if (!ctx) {
                console.error('Canvas trimestral no encontrado');
                return;
            }
            
            // Mostrar canvas y ocultar mensaje si existe
            ctx.style.display = 'block';
            const mensaje = ctx.parentNode.querySelector('.no-data-message');
            if (mensaje) {
                mensaje.remove();
            }

    // Destruir gráfica existente si hay una
    if (window.chartTrimestralInstance) {
        window.chartTrimestralInstance.destroy();
    }

    const labels = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];
    
    const data2025 = [
        trimestres.q1.valor2025,
        trimestres.q2.valor2025,
        trimestres.q3.valor2025,
        trimestres.q4.valor2025
    ];
    
    const data2024 = [
        trimestres.q1.valor2024,
        trimestres.q2.valor2024,
        trimestres.q3.valor2024,
        trimestres.q4.valor2024
    ];

    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '2025',
                    data: data2025,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                    borderWidth: 2
                },
                {
                    label: '2024',
                    data: data2024,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#EF4444',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación Trimestral 2025 vs 2024',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatearNumero(context.parsed.y)}`;
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
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Trimestres'
                    }
                }
            }
        }
    };

    window.chartTrimestralInstance = new Chart(ctx.getContext('2d'), config);
    
    console.log('Gráfica trimestral creada exitosamente');
}


/**
 * NUEVA: Crear gráfica comparativa (SOLO 2 AÑOS)
 */
async function crearGraficaComparativa(area, indicador, tipo) {
    const anioActual = visualizacionData.anioSeleccionado;
    let anioComparacion;
    
    if (visualizacionData.comparacionSeleccionada === 'anterior') {
        anioComparacion = anioActual - 1;
    } else {
        anioComparacion = parseInt(visualizacionData.comparacionSeleccionada);
    }
    
    // Verificar si mostrar histórico
    const mostrarHistorico = $('#chkMostrarHistorico')?.checked || false;
    
    if (mostrarHistorico) {
        log('Mostrando gráfica histórica completa por checkbox');
        await crearGraficaVisualizacion(area, indicador, tipo);
        return;
    }
    
    try {
        log('Creando gráfica comparativa SOLO 2 AÑOS', { anioActual, anioComparacion, area, indicador });

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

        // CREAR SOLO 2 DATASETS
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
                pointBorderColor: obtenerColorPorAnio(anio),
                borderWidth: 3
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
            text: `${chartTitle} - COMPARATIVO ${anioActual} vs ${anioComparacion}`,
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
            data: { 
                labels: MESES, 
                datasets: datasets 
            },
            options: config
        });

        log('Gráfica comparativa SOLO 2 AÑOS creada exitosamente', { años: [anioComparacion, anioActual] });

    } catch (error) {
        logError('Error en gráfica comparativa', error);
        mostrarNotificacion('Error al crear la gráfica comparativa', 'error');
    }
}

/**
 * Destruir gráficas existentes
 */
function destruirGraficas() {
    try {
        if (typeof currentChart !== 'undefined' && currentChart !== null) {
            currentChart.destroy();
            currentChart = null;
        }
    } catch (e) {
        // Silenciar errores
    }
    
    try {
        if (typeof visualChart !== 'undefined' && visualChart !== null) {
            visualChart.destroy();
            visualChart = null;
        }
    } catch (e) {
        // Silenciar errores
    }
}

/**
 * Redimensionar gráficas
 */
function redimensionarGraficas() {
    try {
        if (typeof currentChart !== 'undefined' && currentChart !== null) {
            currentChart.resize();
        }
    } catch (e) {
        // Silenciar errores
    }
    
    try {
        if (typeof visualChart !== 'undefined' && visualChart !== null) {
            visualChart.resize();
        }
    } catch (e) {
        // Silenciar errores
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
