// Variables globales para los gráficos
let performanceChart = null;
let operationsChart = null;
let timeSeriesChart = null;

// Datos globales
let cacheData = null;
let aggregatedStats = {};

// Colores para los gráficos
const colors = {
    lru: {
        primary: '#4facfe',
        secondary: '#00f2fe',
        background: 'rgba(79, 172, 254, 0.1)'
    },
    random: {
        primary: '#43e97b',
        secondary: '#38f9d7',
        background: 'rgba(67, 233, 123, 0.1)'
    },
    longTail: '#ff6384',
    uniform: '#36a2eb'
};

// Función para cargar datos desde Elasticsearch
async function loadCacheData() {
    try {
        console.log('🔄 Cargando datos de caché...');
        showLoading(true);
        
        const response = await fetch('/api/cache/aggregated-stats');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        cacheData = await response.json();
        console.log('📊 Datos de caché cargados:', cacheData);
        
        // Procesar y mostrar datos
        processAggregatedData();
        updateMetrics();
        createCharts();
        createSummaryTable();
        
        // Actualizar timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error cargando datos de caché:', error);
        showError('Error al cargar los datos de caché. Verifica que la indexación se haya completado.');
        showLoading(false);
    }
}

// Procesar datos agregados
function processAggregatedData() {
    aggregatedStats = {};
    
    if (cacheData && cacheData.combinations) {
        cacheData.combinations.forEach(combo => {
            const key = `${combo.policy}-${combo.distribution}`;
            aggregatedStats[key] = {
                policy: combo.policy,
                distribution: combo.distribution,
                hitRate: combo.avgHitRate,
                totalOperations: combo.totalOperations,
                totalHits: combo.totalHits,
                totalMisses: combo.totalMisses
            };
        });
    }
}

// Actualizar métricas principales
function updateMetrics() {
    const lruStats = calculatePolicyStats('LRU');
    const randomStats = calculatePolicyStats('Random');
    
    // LRU Metrics
    document.getElementById('lru-hit-rate').textContent = 
        lruStats.avgHitRate ? `${(lruStats.avgHitRate * 100).toFixed(1)}%` : 'N/A';
    document.getElementById('lru-operations').textContent = 
        lruStats.totalOps ? `${lruStats.totalOps.toLocaleString()} operaciones` : 'N/A';
    
    // Random Metrics
    document.getElementById('random-hit-rate').textContent = 
        randomStats.avgHitRate ? `${(randomStats.avgHitRate * 100).toFixed(1)}%` : 'N/A';
    document.getElementById('random-operations').textContent = 
        randomStats.totalOps ? `${randomStats.totalOps.toLocaleString()} operaciones` : 'N/A';
    
    // Mejor política
    if (lruStats.avgHitRate && randomStats.avgHitRate) {
        const better = lruStats.avgHitRate > randomStats.avgHitRate ? 'LRU' : 'Random';
        const diff = Math.abs((lruStats.avgHitRate - randomStats.avgHitRate) * 100);
        
        document.getElementById('best-policy').textContent = better;
        document.getElementById('performance-diff').textContent = `+${diff.toFixed(1)}% mejor`;
    }
}

// Calcular estadísticas por política
function calculatePolicyStats(policy) {
    const policyData = Object.values(aggregatedStats).filter(stat => stat.policy === policy);
    
    if (policyData.length === 0) return { avgHitRate: null, totalOps: null };
    
    const avgHitRate = policyData.reduce((sum, stat) => sum + stat.hitRate, 0) / policyData.length;
    const totalOps = policyData.reduce((sum, stat) => sum + stat.totalOperations, 0);
    
    return { avgHitRate, totalOps };
}

// Crear gráfico de comparación de rendimiento
function createPerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const lruData = [];
    const randomData = [];
    const labels = [];
    
    ['long_tail', 'uniform'].forEach(dist => {
        const lruKey = `LRU-${dist}`;
        const randomKey = `Random-${dist}`;
        
        if (aggregatedStats[lruKey] && aggregatedStats[randomKey]) {
            labels.push(dist === 'long_tail' ? 'Long Tail' : 'Uniform');
            lruData.push(aggregatedStats[lruKey].hitRate * 100);
            randomData.push(aggregatedStats[randomKey].hitRate * 100);
        }
    });
    
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'LRU',
                    data: lruData,
                    backgroundColor: colors.lru.primary,
                    borderColor: colors.lru.secondary,
                    borderWidth: 2
                },
                {
                    label: 'Random',
                    data: randomData,
                    backgroundColor: colors.random.primary,
                    borderColor: colors.random.secondary,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Hit Rate (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Distribución'
                    }
                }
            }
        }
    });
}

// Crear gráfico de distribución de operaciones
function createOperationsChart() {
    const ctx = document.getElementById('operationsChart').getContext('2d');
    
    if (operationsChart) {
        operationsChart.destroy();
    }
    
    const data = [];
    const labels = [];
    const backgroundColors = [];
    
    Object.entries(aggregatedStats).forEach(([key, stats]) => {
        labels.push(`${stats.policy}\n${stats.distribution}`);
        data.push(stats.totalOperations);
        backgroundColors.push(stats.policy === 'LRU' ? colors.lru.primary : colors.random.primary);
    });
    
    operationsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Crear gráfico de serie temporal
async function createTimeSeriesChart() {
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    
    if (timeSeriesChart) {
        timeSeriesChart.destroy();
    }
    
    try {
        // Cargar datos de serie temporal
        const response = await fetch('/api/cache/timeseries');
        const timeSeriesData = await response.json();
        
        const datasets = [];
        
        // Crear datasets para cada combinación
        Object.entries(timeSeriesData).forEach(([key, data]) => {
            const [policy, distribution] = key.split('-');
            const color = policy === 'LRU' ? 
                (distribution === 'long_tail' ? colors.lru.primary : colors.lru.secondary) :
                (distribution === 'long_tail' ? colors.random.primary : colors.random.secondary);
            
            datasets.push({
                label: `${policy} - ${distribution}`,
                data: data.map(point => ({
                    x: new Date(point.timestamp),
                    y: point.avgHitRate * 100
                })),
                borderColor: color,
                backgroundColor: color + '20',
                fill: false,
                tension: 0.4
            });
        });
        
        timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        },
                        title: {
                            display: true,
                            text: 'Tiempo'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Hit Rate (%)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando datos de serie temporal:', error);
    }
}

// Crear tabla de resumen
function createSummaryTable() {
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    
    Object.entries(aggregatedStats).forEach(([key, stats]) => {
        const row = document.createElement('tr');
        const hitRateClass = stats.hitRate > 0.7 ? 'text-green-600' : 
                            stats.hitRate > 0.5 ? 'text-yellow-600' : 'text-red-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats.policy === 'LRU' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                    ${stats.policy}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${stats.distribution === 'long_tail' ? 'Long Tail' : 'Uniform'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${hitRateClass}">
                ${(stats.hitRate * 100).toFixed(2)}%
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${stats.totalHits.toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${stats.totalMisses.toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${stats.totalOperations.toLocaleString()}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Crear todos los gráficos
function createCharts() {
    createPerformanceChart();
    createOperationsChart();
    createTimeSeriesChart();
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => {
        el.style.display = show ? 'flex' : 'none';
    });
}

// Mostrar error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
    errorDiv.innerHTML = `
        <div class="flex">
            <div class="ml-3">
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Cache Dashboard cargado');
    loadCacheData();
    
    // Botón de actualización
    document.getElementById('refreshBtn').addEventListener('click', loadCacheData);
    
    // Botón de exportar (placeholder)
    document.getElementById('exportBtn').addEventListener('click', function() {
        alert('Funcionalidad de exportación en desarrollo');
    });
    
    // Checkboxes para filtros de serie temporal
    ['showLRU', 'showRandom', 'showLongTail', 'showUniform'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            // Actualizar visibilidad de datasets
            if (timeSeriesChart) {
                updateTimeSeriesVisibility();
            }
        });
    });
    
    // Auto-refresh cada 60 segundos
    setInterval(loadCacheData, 60000);
});

// Actualizar visibilidad de serie temporal
function updateTimeSeriesVisibility() {
    if (!timeSeriesChart) return;
    
    const showLRU = document.getElementById('showLRU').checked;
    const showRandom = document.getElementById('showRandom').checked;
    const showLongTail = document.getElementById('showLongTail').checked;
    const showUniform = document.getElementById('showUniform').checked;
    
    timeSeriesChart.data.datasets.forEach((dataset, index) => {
        const label = dataset.label.toLowerCase();
        const shouldShow = 
            (showLRU && label.includes('lru') || showRandom && label.includes('random')) &&
            (showLongTail && label.includes('long_tail') || showUniform && label.includes('uniform'));
        
        timeSeriesChart.setDatasetVisibility(index, shouldShow);
    });
    
    timeSeriesChart.update();
}
