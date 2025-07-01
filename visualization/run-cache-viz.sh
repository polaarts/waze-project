#!/bin/bash

# Cache Performance Visualization Setup Script
# Este script configura e ejecuta toda la infraestructura de visualización de caché

set -e

echo "🚀 Cache Performance Visualization Setup"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con colores
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar dependencias
check_dependencies() {
    log_info "Verificando dependencias..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm no está instalado"
        exit 1
    fi
    
    log_success "Dependencias verificadas"
}

# Instalar paquetes npm
install_packages() {
    log_info "Instalando dependencias de Node.js..."
    npm install
    log_success "Dependencias instaladas"
}

# Verificar archivos de datos
check_data_files() {
    log_info "Verificando archivos de datos de caché..."
    
    if [ ! -f "../cache/data/long_tail_distribution.json" ]; then
        log_warning "Archivo long_tail_distribution.json no encontrado"
        log_info "Ejecutando simulador de caché..."
        cd ../cache && npm install && node index.js && cd ../visualization
    fi
    
    if [ ! -f "../cache/data/even_distribution.json" ]; then
        log_warning "Archivo even_distribution.json no encontrado"
        log_info "Ejecutando simulador de caché..."
        cd ../cache && npm install && node index.js && cd ../visualization
    fi
    
    log_success "Archivos de datos verificados"
}

# Verificar conexión a Elasticsearch
check_elasticsearch() {
    log_info "Verificando conexión a Elasticsearch..."
    
    ES_HOST=${ELASTICSEARCH_HOST:-"http://localhost:9200"}
    
    if curl -s -f "$ES_HOST" > /dev/null; then
        log_success "Elasticsearch disponible en $ES_HOST"
    else
        log_warning "Elasticsearch no disponible en $ES_HOST"
        log_info "Asegúrate de que Elasticsearch esté ejecutándose"
        log_info "Puedes usar Docker: docker run -p 9200:9200 -e 'discovery.type=single-node' elasticsearch:8.11.0"
    fi
}

# Ejecutar indexación de métricas de caché
run_cache_indexing() {
    log_info "Ejecutando indexación de métricas de caché..."
    node cache-indexer.js
    log_success "Indexación de caché completada"
}

# Iniciar servidor de visualización
start_visualization_server() {
    log_info "Iniciando servidor de visualización..."
    log_info "Servidor disponible en: http://localhost:${PORT:-3000}"
    log_info "Presiona Ctrl+C para detener el servidor"
    node server.js
}

# Mostrar información de Kibana
show_kibana_info() {
    echo ""
    log_info "🔍 CONFIGURACIÓN DE KIBANA"
    echo "========================="
    echo "1. Accede a Kibana: http://localhost:5601"
    echo "2. Ve a 'Stack Management' > 'Saved Objects'"
    echo "3. Importa los archivos JSON desde ./kibana-exports/"
    echo "4. Los archivos a importar:"
    echo "   - cache-hit-rate-timeseries.json"
    echo "   - cache-performance-comparison.json"
    echo "   - cache-operations-histogram.json"
    echo "   - cache-summary-table.json"
    echo "   - cache-performance-dashboard.json"
    echo "5. Ve a 'Dashboard' y abre 'Cache Performance Dashboard'"
    echo ""
}

# Función principal
main() {
    case "${1:-all}" in
        "deps")
            check_dependencies
            install_packages
            ;;
        "data")
            check_data_files
            ;;
        "elasticsearch")
            check_elasticsearch
            ;;
        "index")
            run_cache_indexing
            ;;
        "server")
            start_visualization_server
            ;;
        "kibana-info")
            show_kibana_info
            ;;
        "setup")
            check_dependencies
            install_packages
            check_data_files
            check_elasticsearch
            show_kibana_info
            ;;
        "all")
            check_dependencies
            install_packages
            check_data_files
            check_elasticsearch
            run_cache_indexing
            show_kibana_info
            log_success "Setup completo! Ahora puedes iniciar el servidor con: ./run-cache-viz.sh server"
            ;;
        *)
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos disponibles:"
            echo "  all         - Ejecuta todo el setup (por defecto)"
            echo "  setup       - Configura dependencias y datos sin indexar"
            echo "  deps        - Instala dependencias"
            echo "  data        - Verifica/genera archivos de datos"
            echo "  elasticsearch - Verifica conexión a Elasticsearch"
            echo "  index       - Ejecuta indexación de métricas"
            echo "  server      - Inicia servidor de visualización"
            echo "  kibana-info - Muestra información para configurar Kibana"
            echo ""
            exit 1
            ;;
    esac
}

# Ejecutar función principal con argumentos
main "$@"
