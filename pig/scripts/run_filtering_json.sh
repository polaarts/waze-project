set -e

echo "Ejecutando filtrado de datos Waze con salida JSON array..."

cd /app

echo "Generando CSV desde base de datos..."
if [ -f "db/eventos.db" ]; then
    echo "id,collection,type,city,street,severity,reportBy,confidence,eventId" > pig/input_data.csv
    sqlite3 db/eventos.db "SELECT id, collection, type, city, street, severity, reportBy, confidence, eventId FROM eventos ORDER BY id;" | sed 's/|/,/g' >> pig/input_data.csv
    echo "CSV generado: $(wc -l < pig/input_data.csv) líneas"
else
    echo "Error: No se encuentra db/eventos.db"
    exit 1
fi

echo "Limpiando outputs previos..."
rm -rf pig/output/filtered_raw_data
rm -f pig/output/filtered_data.json

echo "Ejecutando Apache Pig - Filtrado..."
pig -f pig/scripts/filtering.pig

if [ ! -f "pig/output/filtered_raw_data/part-m-00000" ]; then
    echo "Error: No se generó el archivo de salida esperado"
    exit 1
fi

echo "Convirtiendo a formato JSON array..."

echo "[" > pig/output/filtered_data.json

total_lines=$(wc -l < pig/output/filtered_raw_data/part-m-00000)
current_line=0

while IFS= read -r line; do
    current_line=$((current_line + 1))
    
    echo "  $line" >> pig/output/filtered_data.json
    
    if [ $current_line -lt $total_lines ]; then
        sed -i '$ s/$/,/' pig/output/filtered_data.json
    fi
done < pig/output/filtered_raw_data/part-m-00000

echo "]" >> pig/output/filtered_data.json

echo ""
echo "Proceso completado exitosamente!"
echo "Estadísticas:"
echo "- Total de registros procesados: $total_lines"
echo "- Archivo JSON generado: pig/output/filtered_data.json"
echo "- Tamaño del archivo: $(du -h pig/output/filtered_data.json | cut -f1)"

echo ""
echo "Verificando formato JSON..."
if command -v python3 &> /dev/null; then
    if python3 -m json.tool pig/output/filtered_data.json > /dev/null 2>&1; then
        echo "El archivo JSON es válido"
        echo "Primeros 3 registros:"
        python3 -c "import json; data=json.load(open('pig/output/filtered_data.json')); [print(f'  {i+1}. {item[\"city\"]} - {item[\"type\"]} - {item[\"street\"]}') for i, item in enumerate(data[:3])]" 2>/dev/null || echo "Error al mostrar registros de ejemplo"
    else
        echo "El archivo JSON tiene errores de formato"
        echo "Primeras líneas del archivo para debug:"
        head -5 pig/output/filtered_data.json
    fi
else
    echo "Python3 no disponible para validar JSON"
fi

echo ""
echo "Archivo final disponible en: pig/output/filtered_data.json"
