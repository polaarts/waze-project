# SCRIPT DE GESTIÓN DEL PROYECTO WAZE DOCKERIZADO
# Permite ejecutar módulos específicos fácilmente

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper
show_help() {
    echo -e "${BLUE}Proyecto Waze - Sistema Distribuido Dockerizado${NC}"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo ""
    echo -e "${YELLOW}Gestión de Contenedores:${NC}"
    echo "  build          - Construir todos los contenedores"
    echo "  build-cache    - Construir solo módulo cache"
    echo "  build-pig      - Construir solo módulo pig"
    echo "  up             - Levantar todos los servicios"
    echo "  down           - Detener todos los servicios"
    echo "  status         - Ver estado de contenedores"
    echo ""
    echo -e "${YELLOW}Módulo Cache:${NC}"
    echo "  cache          - Ejecutar módulo cache (scraper + redis)"
    echo ""
    echo -e "${YELLOW}Módulo Pig:${NC}"
    echo "  pig            - Ejecutar módulo pig"
    echo "  filtering      - Ejecutar filtrado de datos"
    echo "  analysis       - Ejecutar análisis geográfico"
    echo "  pig-full       - Ejecutar filtrado + análisis completo"
    echo ""
    echo -e "${YELLOW}Utilidades:${NC}"
    echo "  results        - Mostrar resultados de análisis"
    echo "  clean          - Limpiar outputs de pig"
    echo "  logs           - Ver logs de todos los servicios"
    echo ""
    echo "Ejemplos:"
    echo "  $0 build        # Construir todo"
    echo "  $0 cache        # Solo recolección de datos"
    echo "  $0 pig-full     # Solo filtrado y procesamiento"
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Error: Docker no está ejecutándose${NC}"
        exit 1
    fi
}

# Construir contenedores
build_all() {
    echo -e "${BLUE}Construyendo todos los contenedores...${NC}"
    docker compose build
    echo -e "${GREEN}Construcción completada${NC}"
}

build_cache() {
    echo -e "${BLUE}Construyendo módulo cache...${NC}"
    docker compose build cache
    echo -e "${GREEN}Módulo cache construido${NC}"
}

build_pig() {
    echo -e "${BLUE}Construyendo módulo pig...${NC}"
    docker compose build pig
    echo -e "${GREEN}Módulo pig construido${NC}"
}

# Gestión de servicios
up_all() {
    echo -e "${BLUE}Levantando todos los servicios...${NC}"
    docker compose up -d
    echo -e "${GREEN}Servicios iniciados${NC}"
    docker compose ps
}

down_all() {
    echo -e "${BLUE}Deteniendo todos los servicios...${NC}"
    docker compose down
    echo -e "${GREEN}Servicios detenidos${NC}"
}

# Módulo Cache
run_cache() {
    echo -e "${BLUE}Ejecutando módulo cache...${NC}"
    docker compose up cache redis -d
    echo -e "${GREEN}Módulo cache iniciado${NC}"
    echo -e "${YELLOW}Ver logs con: $0 cache-logs${NC}"
}

# Módulo Pig
run_pig() {
    echo -e "${BLUE}Ejecutando módulo pig...${NC}"
    docker compose up pig -d
    echo -e "${GREEN}Módulo pig iniciado${NC}"
    echo -e "${YELLOW}Comandos disponibles:${NC}"
    echo "  $0 filtering    - Ejecutar filtrado"
    echo "  $0 analysis     - Ejecutar análisis"
    echo "  $0 pig-shell    - Acceder al shell"
}

pig_shell() {
    echo -e "${BLUE}Accediendo al shell del contenedor pig...${NC}"
    docker exec -it waze-pig bash
}

run_filtering() {
    echo -e "${BLUE}Ejecutando filtrado de datos...${NC}"
    docker compose up pig -d
    docker exec -it waze-pig bash /app/scripts/run_filtering.sh
    echo -e "${GREEN}Filtrado completado${NC}"
}

run_analysis() {
    echo -e "${BLUE}Ejecutando análisis geográfico...${NC}"
    docker compose up pig -d
    docker exec -it waze-pig bash /app/scripts/run_analysis.sh
    echo -e "${GREEN}Análisis completado${NC}"
}

run_pig_full() {
    echo -e "${BLUE}Ejecutando procesamiento completo (filtrado + análisis)...${NC}"
    docker compose up pig -d
    echo -e "${YELLOW}Paso 1: Filtrado de datos...${NC}"
    docker exec -it waze-pig bash /app/scripts/run_filtering.sh
    echo -e "${YELLOW}Paso 2: Análisis geográfico...${NC}"
    docker exec -it waze-pig bash /app/scripts/run_analysis.sh
    echo -e "${GREEN}Procesamiento completo terminado${NC}"
    show_results
}

# Utilidades
show_results() {
    echo -e "${BLUE}Resultados de análisis:${NC}"
    docker exec -it waze-pig ls -la /app/pig/output/ || echo -e "${YELLOW}No hay resultados disponibles${NC}"
}

clean_outputs() {
    echo -e "${BLUE}Limpiando outputs de pig...${NC}"
    docker exec -it waze-pig rm -rf /app/pig/output/analysis_* 2>/dev/null || true
    echo -e "${GREEN}Outputs limpiados${NC}"
}

show_status() {
    echo -e "${BLUE}Estado de contenedores:${NC}"
    docker compose ps
}

show_logs() {
    echo -e "${BLUE}Logs de todos los servicios:${NC}"
    docker compose logs -f
}

# Función principal
main() {
    check_docker

    case "${1:-help}" in
        "build")
            build_all
            ;;
        "build-cache")
            build_cache
            ;;
        "build-pig")
            build_pig
            ;;
        "up")
            up_all
            ;;
        "down")
            down_all
            ;;
        "status")
            show_status
            ;;
        "cache")
            run_cache
            ;;
        "cache-logs")
            cache_logs
            ;;
        "redis-cli")
            redis_cli
            ;;
        "pig")
            run_pig
            ;;
        "pig-shell")
            pig_shell
            ;;
        "filtering")
            run_filtering
            ;;
        "analysis")
            run_analysis
            ;;
        "pig-full")
            run_pig_full
            ;;
        "results")
            show_results
            ;;
        "clean")
            clean_outputs
            ;;
        "logs")
            show_logs
            ;;
        "help"|"-h"|"--help"|*)
            show_help
            ;;
    esac
}

main "$@"
