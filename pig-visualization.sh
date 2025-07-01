#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VISUALIZATION_DIR="$SCRIPT_DIR/visualization"
PIG_OUTPUT_DIR="$SCRIPT_DIR/pig/output"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  setup      - Configurar el entorno de visualización"
    echo "  index      - Indexar datos de Pig en Elasticsearch"
    echo "  server     - Ejecutar servidor de visualización"
    echo "  docker     - Levantar servicios con Docker"
    echo "  status     - Verificar estado de servicios"
    echo "  clean      - Limpiar índices de Elasticsearch"
    echo "  help       - Mostrar esta ayuda"
}

check_prerequisites() {
    echo -e "${BLUE}Verificando prerrequisitos...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker no está instalado${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose no está instalado${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Node.js no está instalado (opcional para desarrollo local)${NC}"
    fi
    
    echo -e "${GREEN}Prerrequisitos verificados${NC}"
}

setup_environment() {
    echo -e "${BLUE}Configurando entorno...${NC}"
    
    mkdir -p "$PIG_OUTPUT_DIR"
    mkdir -p "$VISUALIZATION_DIR/kibana-pig-exports"
    
    if [[ ! -f "$VISUALIZATION_DIR/.env" ]]; then
        echo -e "${YELLOW}Archivo .env no encontrado, creando uno por defecto...${NC}"
        cat > "$VISUALIZATION_DIR/.env" << EOF
ELASTICSEARCH_HOST=http://localhost:9200
ES_INDEX=waze-events
ES_CACHE_INDEX=waze-cache-metrics
ES_PIG_INDEX=waze-pig-metrics
PORT=3000
CACHE_SIZE=150
TIME_INTERVAL_MS=100
EOF
    fi
    
    echo -e "${GREEN}Entorno configurado${NC}"
}

check_pig_data() {
    echo -e "${BLUE}Verificando datos de Pig...${NC}"
    
    local required_files=(
        "$PIG_OUTPUT_DIR/analysis_by_type.json"
        "$PIG_OUTPUT_DIR/analysis_by_city.json"
        "$PIG_OUTPUT_DIR/consolidated_summary.json"
        "$PIG_OUTPUT_DIR/filtered_raw_data/part-m-00000"
    )
    
    local missing_files=()
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$(basename "$file")")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        echo -e "${RED}Archivos de Pig faltantes: ${missing_files[*]}${NC}"
        echo -e "${YELLOW}Ejecuta el análisis de Pig primero:${NC}"
        echo "   cd pig && ./scripts/run_analysis.sh"
        return 1
    fi
    
    echo -e "${GREEN}Datos de Pig disponibles${NC}"
    return 0
}

check_elasticsearch() {
    echo -e "${BLUE}Verificando Elasticsearch...${NC}"
    
    local es_host="${ELASTICSEARCH_HOST:-http://localhost:9200}"
    
    if curl -s -f "$es_host/_cluster/health" > /dev/null; then
        echo -e "${GREEN}Elasticsearch está funcionando${NC}"
        return 0
    else
        echo -e "${RED}Elasticsearch no está disponible en $es_host${NC}"
        return 1
    fi
}

index_pig_data() {
    echo -e "${BLUE}Indexando datos de Pig...${NC}"
    
    if ! check_pig_data; then
        exit 1
    fi
    
    if ! check_elasticsearch; then
        echo -e "${YELLOW}Inicia Elasticsearch:${NC}"
        echo "   docker-compose up -d elasticsearch"
        exit 1
    fi
    
    cd "$VISUALIZATION_DIR"
    if command -v node &> /dev/null; then
        echo -e "${BLUE}Ejecutando indexador...${NC}"
        node pig-indexer.js
    else
        echo -e "${YELLOW}Node.js no disponible, usando Docker...${NC}"
        docker-compose run --rm visualization node pig-indexer.js
    fi
    
    echo -e "${GREEN}Indexación completada${NC}"
}

start_server() {
    echo -e "${BLUE}Iniciando servidor de visualización...${NC}"
    
    cd "$VISUALIZATION_DIR"
    if command -v node &> /dev/null; then
        echo -e "${BLUE}Servidor local en http://localhost:3000${NC}"
        node server.js
    else
        echo -e "${YELLOW}Node.js no disponible, usando Docker...${NC}"
        docker-compose up visualization
    fi
}

start_docker() {
    echo -e "${BLUE}Levantando servicios con Docker...${NC}"
    
    docker-compose up -d elasticsearch kibana redis
    
    echo -e "${BLUE}Esperando que Elasticsearch esté listo...${NC}"
    until curl -s -f http://localhost:9200/_cluster/health > /dev/null; do
        echo -n "."
        sleep 2
    done
    echo ""
    
    echo -e "${GREEN}Elasticsearch listo${NC}"
    
    if check_pig_data; then
        index_pig_data
    fi
    
    docker-compose up -d visualization
    
    echo -e "${GREEN}Servicios iniciados${NC}"
    echo -e "${BLUE}Accede a las interfaces:${NC}"
    echo "   - Dashboard Pig: http://localhost:3000/pig"
    echo "   - Kibana: http://localhost:5601"
    echo "   - Elasticsearch: http://localhost:9200"
}

check_status() {
    echo -e "${BLUE}Verificando estado de servicios...${NC}"
    
    if curl -s -f http://localhost:9200/_cluster/health > /dev/null; then
        echo -e "${GREEN}Elasticsearch: Funcionando${NC}"
        
        if curl -s -f "http://localhost:9200/waze-pig-metrics" > /dev/null; then
            local count=$(curl -s "http://localhost:9200/waze-pig-metrics/_count" | jq -r '.count // 0')
            echo -e "${GREEN}Índice waze-pig-metrics: $count documentos${NC}"
        else
            echo -e "${YELLOW}Índice waze-pig-metrics: No existe${NC}"
        fi
    else
        echo -e "${RED}Elasticsearch: No disponible${NC}"
    fi
    
    if curl -s -f http://localhost:5601/api/status > /dev/null; then
        echo -e "${GREEN}Kibana: Funcionando${NC}"
    else
        echo -e "${RED}Kibana: No disponible${NC}"
    fi
    
    if curl -s -f http://localhost:3000/api/pig/summary > /dev/null; then
        echo -e "${GREEN}Servidor de visualización: Funcionando${NC}"
    else
        echo -e "${RED}Servidor de visualización: No disponible${NC}"
    fi
    
    check_pig_data
}

clean_elasticsearch() {
    echo -e "${BLUE}Limpiando índices de Elasticsearch...${NC}"
    
    if ! check_elasticsearch; then
        echo -e "${RED}Elasticsearch no está disponible${NC}"
        exit 1
    fi
    
    local indices=("waze-pig-metrics" "waze-events" "waze-cache-metrics")
    
    for index in "${indices[@]}"; do
        if curl -s -f "http://localhost:9200/$index" > /dev/null; then
            echo -e "${YELLOW}Eliminando índice $index...${NC}"
            curl -X DELETE "http://localhost:9200/$index"
            echo -e "${GREEN}Índice $index eliminado${NC}"
        else
            echo -e "${BLUE}Índice $index no existe${NC}"
        fi
    done
}

main() {
    case "${1:-help}" in
        "setup")
            check_prerequisites
            setup_environment
            ;;
        "index")
            setup_environment
            index_pig_data
            ;;
        "server")
            setup_environment
            start_server
            ;;
        "docker")
            check_prerequisites
            setup_environment
            start_docker
            ;;
        "status")
            check_status
            ;;
        "clean")
            clean_elasticsearch
            ;;
        "help"|*)
            print_usage
            ;;
    esac
}

main "$@"
