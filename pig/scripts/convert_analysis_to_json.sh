set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Convirtiendo resultados de análisis a JSON...${NC}"

cd /home/samuel/Documents/universidad/SD/waze-project

OUTPUT_DIR="pig/output"

convert_analysis_by_type() {
    local input_file="$OUTPUT_DIR/analysis_by_type/part-r-00000"
    local output_file="$OUTPUT_DIR/analysis_by_type.json"
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}Error: No se encontró $input_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Convirtiendo análisis por tipo...${NC}"
    
    echo "{" > "$output_file"
    echo "  \"analysis_type\": \"incident_frequency_by_type\"," >> "$output_file"
    echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$output_file"
    echo "  \"total_types\": $(wc -l < "$input_file")," >> "$output_file"
    echo "  \"data\": [" >> "$output_file"
    
    local total_lines=$(wc -l < "$input_file")
    local current_line=0
    
    while IFS=$'\t' read -r incident_type frequency; do
        current_line=$((current_line + 1))
        
        echo -n "    {" >> "$output_file"
        echo -n "\"type\": \"$incident_type\", " >> "$output_file"
        echo -n "\"frequency\": $frequency" >> "$output_file"
        echo -n "}" >> "$output_file"
        
        if [ $current_line -lt $total_lines ]; then
            echo "," >> "$output_file"
        else
            echo "" >> "$output_file"
        fi
    done < "$input_file"
    
    echo "  ]," >> "$output_file"
    echo "  \"summary\": {" >> "$output_file"
    
    local total_incidents=$(awk -F'\t' '{sum += $2} END {print sum}' "$input_file")
    local most_frequent=$(sort -k2 -nr "$input_file" | head -1)
    local most_frequent_type=$(echo "$most_frequent" | cut -f1)
    local most_frequent_count=$(echo "$most_frequent" | cut -f2)
    
    echo "    \"total_incidents\": $total_incidents," >> "$output_file"
    echo "    \"most_frequent_type\": \"$most_frequent_type\"," >> "$output_file"
    echo "    \"most_frequent_count\": $most_frequent_count" >> "$output_file"
    echo "  }" >> "$output_file"
    echo "}" >> "$output_file"
    
    echo -e "${GREEN}Generado: $output_file${NC}"
    echo -e "${GREEN}Total tipos: $(wc -l < "$input_file"), Total incidentes: $total_incidents${NC}"
}

convert_analysis_by_city() {
    local input_file="$OUTPUT_DIR/analysis_by_city/part-r-00000"
    local output_file="$OUTPUT_DIR/analysis_by_city.json"
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}Error: No se encontró $input_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Convirtiendo análisis por ciudad...${NC}"
    
    echo "{" > "$output_file"
    echo "  \"analysis_type\": \"incident_frequency_by_city\"," >> "$output_file"
    echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$output_file"
    echo "  \"total_cities\": $(wc -l < "$input_file")," >> "$output_file"
    echo "  \"data\": [" >> "$output_file"
    
    local total_lines=$(wc -l < "$input_file")
    local current_line=0
    
    while IFS=$'\t' read -r city_name incident_count; do
        current_line=$((current_line + 1))
        
        echo -n "    {" >> "$output_file"
        echo -n "\"city\": \"$city_name\", " >> "$output_file"
        echo -n "\"incidents\": $incident_count" >> "$output_file"
        echo -n "}" >> "$output_file"
        
        if [ $current_line -lt $total_lines ]; then
            echo "," >> "$output_file"
        else
            echo "" >> "$output_file"
        fi
    done < "$input_file"
    
    echo "  ]," >> "$output_file"
    echo "  \"summary\": {" >> "$output_file"
    
    local total_incidents=$(awk -F'\t' '{sum += $2} END {print sum}' "$input_file")
    local most_active=$(sort -k2 -nr "$input_file" | head -1)
    local most_active_city=$(echo "$most_active" | cut -f1)
    local most_active_count=$(echo "$most_active" | cut -f2)
    local avg_incidents=$(awk -F'\t' '{sum += $2} END {printf "%.2f", sum/NR}' "$input_file")
    
    echo "    \"total_incidents\": $total_incidents," >> "$output_file"
    echo "    \"most_active_city\": \"$most_active_city\"," >> "$output_file"
    echo "    \"most_active_count\": $most_active_count," >> "$output_file"
    echo "    \"average_incidents_per_city\": $avg_incidents" >> "$output_file"
    echo "  }" >> "$output_file"
    echo "}" >> "$output_file"
    
    echo -e "${GREEN}Generado: $output_file${NC}"
    echo -e "${GREEN}Total ciudades: $(wc -l < "$input_file"), Total incidentes: $total_incidents${NC}"
}

create_consolidated_summary() {
    local output_file="$OUTPUT_DIR/consolidated_summary.json"
    
    if [ ! -f "$OUTPUT_DIR/analysis_by_type.json" ] || [ ! -f "$OUTPUT_DIR/analysis_by_city.json" ]; then
        echo -e "${RED}Error: Archivos de análisis no encontrados para crear resumen consolidado${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Creando resumen consolidado...${NC}"
    
    echo "{" > "$output_file"
    echo "  \"consolidated_summary\": {" >> "$output_file"
    echo "    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$output_file"
    echo "    \"analysis_files\": [" >> "$output_file"
    echo "      \"analysis_by_type.json\"," >> "$output_file"
    echo "      \"analysis_by_city.json\"" >> "$output_file"
    echo "    ]," >> "$output_file"
    
    local total_types=$(wc -l < "$OUTPUT_DIR/analysis_by_type/part-r-00000")
    local total_cities=$(wc -l < "$OUTPUT_DIR/analysis_by_city/part-r-00000")
    local total_incidents_type=$(awk -F'\t' '{sum += $2} END {print sum}' "$OUTPUT_DIR/analysis_by_type/part-r-00000")
    local total_incidents_city=$(awk -F'\t' '{sum += $2} END {print sum}' "$OUTPUT_DIR/analysis_by_city/part-r-00000")
    
    echo "    \"totals\": {" >> "$output_file"
    echo "      \"unique_incident_types\": $total_types," >> "$output_file"
    echo "      \"unique_cities\": $total_cities," >> "$output_file"
    echo "      \"total_incidents_processed\": $total_incidents_type" >> "$output_file"
    echo "    }" >> "$output_file"
    echo "  }" >> "$output_file"
    echo "}" >> "$output_file"
    
    echo -e "${GREEN}Generado: $output_file${NC}"
    echo -e "${GREEN}Resumen consolidado creado con $total_types tipos y $total_cities ciudades${NC}"
}

validate_json() {
    local file="$1"
    
    if command -v python3 &> /dev/null; then
        if python3 -m json.tool "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}JSON válido: $(basename "$file")${NC}"
            return 0
        else
            echo -e "${RED}JSON inválido: $(basename "$file")${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}Python3 no disponible para validar JSON${NC}"
        return 0
    fi
}

if [ ! -d "$OUTPUT_DIR/analysis_by_type" ] || [ ! -d "$OUTPUT_DIR/analysis_by_city" ]; then
    echo -e "${RED} Error: Directorios de análisis no encontrados${NC}"
    echo -e "${YELLOW}Ejecuta primero: ./manage.sh pig-full${NC}"
    exit 1
fi

convert_analysis_by_type
convert_analysis_by_city
create_consolidated_summary

echo ""
echo -e "${BLUE}Validando archivos JSON generados...${NC}"

validate_json "$OUTPUT_DIR/analysis_by_type.json"
validate_json "$OUTPUT_DIR/analysis_by_city.json"
validate_json "$OUTPUT_DIR/consolidated_summary.json"

echo ""
echo -e "${GREEN}Conversión completada${NC}"
echo ""
echo -e "${BLUE}Archivos JSON generados:${NC}"
echo -e "$OUTPUT_DIR/analysis_by_type.json"
echo -e "$OUTPUT_DIR/analysis_by_city.json"
echo -e "$OUTPUT_DIR/consolidated_summary.json"

echo ""
echo -e "${BLUE} Resumen:${NC}"
if [ -f "$OUTPUT_DIR/analysis_by_type.json" ]; then
    types_count=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/analysis_by_type.json')); print(data['total_types'])" 2>/dev/null || echo "N/A")
    echo -e "Total tipos de incidentes: $types_count"
fi

if [ -f "$OUTPUT_DIR/analysis_by_city.json" ]; then
    cities_count=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/analysis_by_city.json')); print(data['total_cities'])" 2>/dev/null || echo "N/A")
    echo -e "Total ciudades: $cities_count"
fi
