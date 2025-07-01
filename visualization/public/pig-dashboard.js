// Pig Dashboard JavaScript
class PigDashboard {
    constructor() {
        this.charts = {};
        this.initDashboard();
    }

    async initDashboard() {
        try {
            await this.loadSummaryMetrics();
            await this.loadIncidentsByType();
            await this.loadIncidentsByCity();
            await this.loadFilteringTimeline();
            await this.loadTopStreets();
            await this.loadProcessingStatus();
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Error al inicializar el dashboard');
        }
    }

    async loadSummaryMetrics() {
        try {
            const response = await fetch('/api/pig/summary');
            const data = await response.json();
            
            const summaryHtml = `
                <div class="summary-grid">
                    <div class="metric-card">
                        <div class="metric-value">${data.total_incidents_processed?.toLocaleString() || 'N/A'}</div>
                        <div class="metric-label">Total Incidentes</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.unique_incident_types || 'N/A'}</div>
                        <div class="metric-label">Tipos Únicos</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.unique_cities || 'N/A'}</div>
                        <div class="metric-label">Ciudades Únicas</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.analysis_files?.length || 'N/A'}</div>
                        <div class="metric-label">Archivos Analizados</div>
                    </div>
                </div>
            `;
            
            document.getElementById('summaryContent').innerHTML = summaryHtml;
        } catch (error) {
            console.error('Error loading summary metrics:', error);
            document.getElementById('summaryContent').innerHTML = '<div class="error">Error al cargar métricas de resumen</div>';
        }
    }

    async loadIncidentsByType() {
        try {
            const response = await fetch('/api/pig/analysis-by-type');
            const data = await response.json();
            
            if (!data.aggregations || !data.aggregations.types || !data.aggregations.types.buckets) {
                throw new Error('Formato de datos inválido para tipos');
            }

            const buckets = data.aggregations.types.buckets;
            const labels = buckets.map(bucket => bucket.key);
            const values = buckets.map(bucket => bucket.total_frequency.value || bucket.doc_count);

            const ctx = document.getElementById('typeChart').getContext('2d');
            
            if (this.charts.typeChart) {
                this.charts.typeChart.destroy();
            }
            
            this.charts.typeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Frecuencia',
                        data: values,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading incidents by type:', error);
            document.getElementById('typeChart').parentElement.innerHTML = '<div class="error">Error al cargar datos por tipo</div>';
        }
    }

    async loadIncidentsByCity() {
        try {
            const response = await fetch('/api/pig/analysis-by-city');
            const data = await response.json();
            
            if (!data.aggregations || !data.aggregations.cities || !data.aggregations.cities.buckets) {
                throw new Error('Formato de datos inválido para ciudades');
            }

            const buckets = data.aggregations.cities.buckets;
            const labels = buckets.map(bucket => bucket.key);
            const values = buckets.map(bucket => bucket.total_incidents.value || bucket.doc_count);

            const ctx = document.getElementById('cityChart').getContext('2d');
            
            if (this.charts.cityChart) {
                this.charts.cityChart.destroy();
            }
            
            this.charts.cityChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                            '#8e44ad', '#27ae60'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading incidents by city:', error);
            document.getElementById('cityChart').parentElement.innerHTML = '<div class="error">Error al cargar datos por ciudad</div>';
        }
    }

    async loadFilteringTimeline() {
        try {
            const response = await fetch('/api/pig/timeseries');
            const data = await response.json();
            
            if (!data.aggregations || !data.aggregations.timeline || !data.aggregations.timeline.buckets) {
                throw new Error('Formato de datos inválido para timeline');
            }

            const buckets = data.aggregations.timeline.buckets;
            const labels = buckets.map(bucket => new Date(bucket.key).toLocaleTimeString());
            const values = buckets.map(bucket => bucket.doc_count);

            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            if (this.charts.timelineChart) {
                this.charts.timelineChart.destroy();
            }
            
            this.charts.timelineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Eventos Filtrados',
                        data: values,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        },
                        x: {
                            ticks: {
                                maxTicksLimit: 10
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading filtering timeline:', error);
            document.getElementById('timelineChart').parentElement.innerHTML = '<div class="error">Error al cargar timeline de filtrado</div>';
        }
    }

    async loadTopStreets() {
        try {
            const response = await fetch('/api/pig/top-streets');
            const data = await response.json();
            
            if (!data.aggregations || !data.aggregations.streets || !data.aggregations.streets.buckets) {
                throw new Error('Formato de datos inválido para calles');
            }

            const buckets = data.aggregations.streets.buckets;
            
            const tableHtml = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ranking</th>
                                <th>Calle</th>
                                <th>Incidentes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${buckets.map((bucket, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${bucket.key}</td>
                                    <td>${bucket.doc_count.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            document.getElementById('streetsContent').innerHTML = tableHtml;
        } catch (error) {
            console.error('Error loading top streets:', error);
            document.getElementById('streetsContent').innerHTML = '<div class="error">Error al cargar top calles</div>';
        }
    }

    async loadProcessingStatus() {
        try {
            const responses = await Promise.all([
                fetch('/api/pig/analysis-by-type'),
                fetch('/api/pig/analysis-by-city'),
                fetch('/api/pig/summary'),
                fetch('/api/pig/timeseries')
            ]);

            const statuses = await Promise.all(responses.map(async (response, index) => {
                const names = ['Análisis por Tipo', 'Análisis por Ciudad', 'Resumen', 'Timeline'];
                try {
                    const data = await response.json();
                    return {
                        name: names[index],
                        status: response.ok ? 'success' : 'error',
                        count: data.aggregations ? Object.values(data.aggregations)[0]?.buckets?.length || data.total || 0 : 0
                    };
                } catch (error) {
                    return {
                        name: names[index],
                        status: 'error',
                        count: 0
                    };
                }
            }));

            const statusHtml = `
                <div>
                    ${statuses.map(status => `
                        <div style="margin-bottom: 10px;">
                            <strong>${status.name}</strong>
                            <span class="status-indicator ${status.status === 'success' ? 'status-success' : 'status-warning'}">
                                ${status.status === 'success' ? '✓ OK' : '⚠ Error'}
                            </span>
                            <div style="font-size: 0.9em; color: #666; margin-top: 2px;">
                                ${status.count} elementos procesados
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('statusContent').innerHTML = statusHtml;
        } catch (error) {
            console.error('Error loading processing status:', error);
            document.getElementById('statusContent').innerHTML = '<div class="error">Error al cargar estado del procesamiento</div>';
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        document.getElementById('lastUpdate').innerHTML = `
            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                Última actualización: ${timeString}
            </div>
        `;
    }

    showError(message) {
        const container = document.querySelector('.container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
        container.insertBefore(errorDiv, container.firstChild);
    }

    // Método para refrescar todos los datos
    async refresh() {
        console.log('Refreshing dashboard...');
        await this.initDashboard();
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.pigDashboard = new PigDashboard();
    
    // Auto-refresh cada 5 minutos
    setInterval(() => {
        window.pigDashboard.refresh();
    }, 5 * 60 * 1000);
});

// Función global para refrescar manualmente
function refreshDashboard() {
    if (window.pigDashboard) {
        window.pigDashboard.refresh();
    }
}
