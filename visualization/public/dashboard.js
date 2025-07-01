let typeChart = null;
let cityChart = null;
let cityBarChart = null;

const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
];

async function loadData() {
    try {
        console.log('Cargando datos...');
        
        const typeResponse = await fetch('/api/data/analysis-by-type');
        const typeData = await typeResponse.json();
        
        const cityResponse = await fetch('/api/data/analysis-by-city');
        const cityData = await cityResponse.json();
        
        const summaryResponse = await fetch('/api/data/consolidated-summary');
        const summaryData = await summaryResponse.json();
        
        console.log('Datos cargados:', { typeData, cityData, summaryData });
        
        updateMetrics(typeData, cityData, summaryData);
        
        createTypeChart(typeData);
        createCityChart(cityData);
        createCityBarChart(cityData);
        createSummaryTable(typeData);
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error al cargar los datos. Verifica que el servidor esté corriendo.');
    }
}

function updateMetrics(typeData, cityData, summaryData) {
    document.getElementById('total-events').textContent = 
        typeData.summary?.total_incidents || summaryData.consolidated_summary?.totals?.total_incidents_processed || 'N/A';
    
    document.getElementById('total-cities').textContent = 
        cityData.total_cities || summaryData.consolidated_summary?.totals?.unique_cities || 'N/A';
    
    document.getElementById('total-types').textContent = 
        typeData.total_types || summaryData.consolidated_summary?.totals?.unique_incident_types || 'N/A';
}

function createTypeChart(data) {
    const ctx = document.getElementById('typeChart').getContext('2d');
    
    if (typeChart) {
        typeChart.destroy();
    }
    
    const labels = data.data.map(item => item.type);
    const frequencies = data.data.map(item => item.frequency);
    
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: frequencies,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = frequencies.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createCityChart(data) {
    const ctx = document.getElementById('cityChart').getContext('2d');
    
    if (cityChart) {
        cityChart.destroy();
    }
    
    const sortedData = [...data.data].sort((a, b) => b.incidents - a.incidents).slice(0, 5);
    const labels = sortedData.map(item => item.city);
    const incidents = sortedData.map(item => item.incidents);
    
    cityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: incidents,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = incidents.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createCityBarChart(data) {
    const ctx = document.getElementById('cityBarChart').getContext('2d');
    
    if (cityBarChart) {
        cityBarChart.destroy();
    }
    
    const sortedData = [...data.data].sort((a, b) => b.incidents - a.incidents);
    const labels = sortedData.map(item => item.city);
    const incidents = sortedData.map(item => item.incidents);
    
    cityBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Incidentes',
                data: incidents,
                backgroundColor: colors[1],
                borderColor: colors[1],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.x} incidentes`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createSummaryTable(data) {
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    
    const total = data.summary.total_incidents;
    
    data.data.forEach(item => {
        const percentage = ((item.frequency / total) * 100).toFixed(1);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.frequency.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${percentage}%</td>
        `;
        tbody.appendChild(row);
    });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Página cargada, iniciando carga de datos...');
    loadData();
    
    setInterval(loadData, 30000);
});
