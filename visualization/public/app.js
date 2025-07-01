class WazeAnalyticsSPA {
    constructor() {
        this.currentModule = 'elasticsearch';
        this.charts = {};
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadModule(this.currentModule);
        this.startPeriodicUpdates();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const module = e.target.getAttribute('data-module');
                this.switchModule(module);
            });
        });
    }

    switchModule(module) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-module="${module}"]`).classList.add('active');

        document.querySelectorAll('.module-container').forEach(container => {
            container.classList.remove('active');
        });
        document.getElementById(`${module}-module`).classList.add('active');

        this.currentModule = module;
        this.loadModule(module);
    }

    async loadModule(module) {
        switch (module) {
            case 'elasticsearch':
                await this.loadElasticsearchModule();
                break;
            case 'cache':
                await this.loadCacheModule();
                break;
            case 'pig':
                await this.loadPigModule();
                break;
        }
    }

    async loadElasticsearchModule() {
        try {
            await this.loadElasticsearchMetrics();
            await this.loadElasticsearchCharts();
            this.updateLastUpdate('es-lastUpdate');
        } catch (error) {
            console.error('Error loading Elasticsearch module:', error);
            this.showError('es-metrics', 'Error cargando métricas de Elasticsearch');
        }
    }

    async loadElasticsearchMetrics() {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        
        const metricsHtml = `
            <div class="metric-card">
                <div class="metric-value">${data.total || 0}</div>
                <div class="metric-label">Total Eventos</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.today || 0}</div>
                <div class="metric-label">Eventos Hoy</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.alerts || 0}</div>
                <div class="metric-label">Alertas Activas</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.jams || 0}</div>
                <div class="metric-label">Congestiones</div>
            </div>
        `;
        
        document.getElementById('es-metrics').innerHTML = metricsHtml;
    }

    async loadElasticsearchCharts() {
        const typeResponse = await fetch('/api/events-by-type');
        const typeData = await typeResponse.json();
        this.createChart('es-typeChart', 'doughnut', typeData, 'Eventos por Tipo');

        const locationResponse = await fetch('/api/events-by-location');
        const locationData = await locationResponse.json();
        this.createChart('es-locationChart', 'bar', locationData, 'Eventos por Ubicación');

        const timelineResponse = await fetch('/api/events-timeline');
        const timelineData = await timelineResponse.json();
        this.createChart('es-timelineChart', 'line', timelineData, 'Timeline de Eventos');
    }

    async loadCacheModule() {
        try {
            await this.loadCacheMetrics();
            await this.loadCacheCharts();
            this.updateLastUpdate('cache-lastUpdate');
        } catch (error) {
            console.error('Error loading Cache module:', error);
            this.showError('cache-metrics', 'Error cargando métricas de Cache');
        }
    }

    async loadCacheMetrics() {
        const response = await fetch('/api/cache/metrics');
        const data = await response.json();
        
        const metricsHtml = `
            <div class="metric-card">
                <div class="metric-value">${data.hit_rate ? (data.hit_rate * 100).toFixed(1) + '%' : 'N/A'}</div>
                <div class="metric-label">Hit Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.formatBytes(data.memory_usage || 0)}</div>
                <div class="metric-label">Memoria Usada</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.operations_per_sec || 0}</div>
                <div class="metric-label">Ops/Seg</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.total_keys || 0}</div>
                <div class="metric-label">Total Keys</div>
            </div>
        `;
        
        document.getElementById('cache-metrics').innerHTML = metricsHtml;
    }

    async loadCacheCharts() {
        const hitRateResponse = await fetch('/api/cache/hit-rate-history');
        const hitRateData = await hitRateResponse.json();
        this.createChart('cache-hitRateChart', 'line', hitRateData, 'Hit Rate Histórico');

        const memoryResponse = await fetch('/api/cache/memory-usage');
        const memoryData = await memoryResponse.json();
        this.createChart('cache-memoryChart', 'line', memoryData, 'Uso de Memoria');

        const opsResponse = await fetch('/api/cache/operations');
        const opsData = await opsResponse.json();
        this.createChart('cache-opsChart', 'bar', opsData, 'Operaciones por Segundo');
    }

    async loadPigModule() {
        try {
            await this.loadPigMetrics();
            await this.loadPigCharts();
            this.updateLastUpdate('pig-lastUpdate');
        } catch (error) {
            console.error('Error loading Pig module:', error);
            this.showError('pig-summaryContent', 'Error cargando análisis de Pig');
        }
    }

    async loadPigMetrics() {
        const response = await fetch('/api/pig/summary');
        const data = await response.json();
        
        const summaryHtml = `
            <div class="summary-grid">
                <div class="metric-card">
                    <div class="metric-value">${data.total_records || 0}</div>
                    <div class="metric-label">Total Registros</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.filtered_records || 0}</div>
                    <div class="metric-label">Registros Filtrados</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.unique_cities || 0}</div>
                    <div class="metric-label">Ciudades Únicas</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.incident_types || 0}</div>
                    <div class="metric-label">Tipos de Incidentes</div>
                </div>
            </div>
        `;
        
        document.getElementById('pig-summaryContent').innerHTML = summaryHtml;

        const streetsResponse = await fetch('/api/pig/top-streets');
        const streetsData = await streetsResponse.json();
        this.loadTopStreets(streetsData);

        const statusResponse = await fetch('/api/pig/status');
        const statusData = await statusResponse.json();
        this.loadProcessingStatus(statusData);
    }

    async loadPigCharts() {
        const typeResponse = await fetch('/api/pig/incidents-by-type');
        const typeData = await typeResponse.json();
        this.createChart('pig-typeChart', 'doughnut', typeData, 'Incidentes por Tipo');

        const cityResponse = await fetch('/api/pig/incidents-by-city');
        const cityData = await cityResponse.json();
        this.createChart('pig-cityChart', 'bar', cityData, 'Incidentes por Ciudad');

        const timelineResponse = await fetch('/api/pig/filtering-timeline');
        const timelineData = await timelineResponse.json();
        this.createChart('pig-timelineChart', 'line', timelineData, 'Timeline de Filtrado');
    }

    loadTopStreets(data) {
        if (!data || data.length === 0) {
            document.getElementById('pig-streetsContent').innerHTML = '<p class="loading">No hay datos de calles disponibles</p>';
            return;
        }

        const tableHtml = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Calle</th>
                            <th>Incidentes</th>
                            <th>Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(street => `
                            <tr>
                                <td>${street.street || 'N/A'}</td>
                                <td>${street.count || 0}</td>
                                <td>${street.percentage ? street.percentage.toFixed(1) + '%' : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('pig-streetsContent').innerHTML = tableHtml;
    }

    loadProcessingStatus(data) {
        const statusHtml = `
            <div class="summary-grid">
                <div class="metric-card">
                    <div class="metric-value">${data.last_run || 'N/A'}</div>
                    <div class="metric-label">Última Ejecución</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.processing_time || 'N/A'}</div>
                    <div class="metric-label">Tiempo de Proceso</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">
                        ${data.status || 'Unknown'}
                        <span class="status-indicator ${data.status === 'Success' ? 'status-success' : 'status-warning'}">
                            ${data.status === 'Success' ? '✓' : '⚠'}
                        </span>
                    </div>
                    <div class="metric-label">Estado</div>
                </div>
            </div>
        `;

        document.getElementById('pig-statusContent').innerHTML = statusHtml;
    }

    createChart(canvasId, type, data, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const config = {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: type === 'doughnut' ? 'right' : 'top'
                    }
                },
                scales: type !== 'doughnut' ? {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                } : {}
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateLastUpdate(elementId) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES');
        const dateString = now.toLocaleDateString('es-ES');
        document.getElementById(elementId).innerHTML = 
            `<small>Última actualización: ${dateString} ${timeString}</small>`;
    }

    showError(elementId, message) {
        document.getElementById(elementId).innerHTML = 
            `<div class="error">${message}</div>`;
    }

    startPeriodicUpdates() {
        setInterval(() => {
            this.loadModule(this.currentModule);
        }, 30000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.wazeApp = new WazeAnalyticsSPA();
});

window.WazeAnalyticsSPA = WazeAnalyticsSPA;
