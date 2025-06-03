echo "Generando input_data.csv desde eventos.db..."

cd /app

if [ ! -f "db/eventos.db" ]; then
    echo "Error: No se encontró el archivo db/eventos.db"
    exit 1
fi

if ! command -v sqlite3 &> /dev/null; then
    echo "Error: sqlite3 no está instalado"
    echo "   Instalar con: sudo apt-get install sqlite3"
    exit 1
fi

mkdir -p pig

total_records=$(sqlite3 db/eventos.db "SELECT COUNT(*) FROM eventos")

echo "Total de registros en la base de datos: $total_records"

echo "Exportando datos a CSV..."

echo "id,collection,type,city,street,severity,reportBy,confidence,eventId" > pig/input_data.csv
sqlite3 db/eventos.db <<EOF
.mode csv
.output pig/input_data_temp.csv
SELECT id, collection, type, city, street, severity, reportBy, confidence, eventId 
FROM eventos 
ORDER BY id;
EOF

tail -n +1 pig/input_data_temp.csv >> pig/input_data.csv

rm -f pig/input_data_temp.csv

if [ -f "pig/input_data.csv" ]; then
    csv_lines=$(wc -l < pig/input_data.csv)
    csv_size=$(du -h pig/input_data.csv | cut -f1)
    
    echo ""
    echo "Archivo CSV generado exitosamente!"
    echo "Estadísticas del archivo generado:"
    echo "   - Ubicación: pig/input_data.csv"
    echo "   - Total de líneas: $csv_lines (incluyendo header)"
    echo "   - Registros de datos: $((csv_lines - 1))"
    echo "   - Tamaño del archivo: $csv_size"
    
    echo ""
    echo "Primeras 5 líneas del archivo:"
    head -5 pig/input_data.csv
    
    echo ""
    echo "Últimas 3 líneas del archivo:"
    tail -3 pig/input_data.csv
    
    echo ""
    echo "Verificación de calidad de datos:"
    
    null_cities=$(grep -c ',NULL,' pig/input_data.csv || echo "0")
    empty_cities=$(grep -c ',"",' pig/input_data.csv || echo "0") 
    none_types=$(grep -ci ',NONE,' pig/input_data.csv || echo "0")
    
    echo "   - Ciudades NULL: $null_cities"
    echo "   - Ciudades vacías: $empty_cities" 
    echo "   - Tipos NONE: $none_types"
    
    problematic_records=$((null_cities + empty_cities + none_types))
    echo "   - Registros que serán filtrados: ~$problematic_records"
    
else
    echo "Error: No se pudo generar el archivo CSV"
    exit 1
fi

echo ""
echo "Archivo listo para procesamiento con Apache Pig!"
echo "   Ejecutar: ./pig/scripts/run_filtering_json.sh"