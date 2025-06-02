set -e

echo "Ejecutando análisis geográfico de datos Waze..."

cd /app

if [ ! -f "pig/output/filtered_raw_data/part-m-00000" ]; then
    echo "Error: No se encontraron datos filtrados"
    echo "Ejecuta primero: docker exec -it waze-pig bash /app/scripts/run_filtering.sh"
    exit 1
fi

echo "Limpiando análisis previos..."
rm -rf pig/output/analysis_*

echo "Ejecutando Apache Pig - Análisis Geográfico..."
pig -f pig/scripts/analysis_geographic_patterns.pig

echo "Resumen de resultados:"

for output_dir in pig/output/analysis_*; do
    if [ -d "$output_dir" ]; then
        name=$(basename "$output_dir")
        if [ -f "$output_dir/part-r-00000" ]; then
            lines=$(wc -l < "$output_dir/part-r-00000")
            echo "$name: $lines registros"
            echo "Primeras 3 líneas:"
            head -3 "$output_dir/part-r-00000" | sed 's/^/         /'
        fi
    fi
done

echo ""
echo "Análisis geográfico completado"
echo "Resultados disponibles en pig/output/analysis_*"
