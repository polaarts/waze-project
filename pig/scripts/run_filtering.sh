set -e

echo "Ejecutando filtrado de datos Waze..."

cd /home/samuel/Documents/universidad/SD/waze-project

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

echo "Ejecutando Apache Pig - Filtrado..."
pig -f pig/scripts/filtering.pig

if [ -f "pig/output/filtered_raw_data/part-m-00000" ]; then
    lines=$(wc -l < pig/output/filtered_raw_data/part-m-00000)
    size=$(du -h pig/output/filtered_raw_data/part-m-00000 | cut -f1)
    echo "Filtrado completado:"
    echo "- Registros procesados: $lines"
    echo "- Tamaño archivo: $size"
    echo "- Ubicación: pig/output/filtered_raw_data/part-m-00000"
else
    echo "Error: No se generó el archivo de salida"
    exit 1
fi

echo "Filtrado completado"
