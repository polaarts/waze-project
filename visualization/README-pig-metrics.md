# Módulo de Visualización y Métricas - Apache Pig

Este módulo implementa la visualización y métricas para la fase de **filtrado y análisis** de datos de Apache Pig en el proyecto Waze. Indexa los resultados de Pig en Elasticsearch y proporciona dashboards y visualizaciones en Kibana.

## Arquitectura

El módulo procesa los siguientes artefactos generados por Apache Pig:

1. **`analysis_by_type.json`** - Análisis de frecuencia por tipo de incidente
2. **`analysis_by_city.json`** - Análisis de frecuencia por ciudad
3. **`consolidated_summary.json`** - Resumen consolidado de las métricas
4. **`filtered_raw_data/part-m-00000`** - Datos filtrados (JSON por línea)

Los datos se indexan en Elasticsearch en el índice `waze-pig-metrics` con diferentes fases:
- `phase: "analysis"` - Para datos agregados de análisis
- `phase: "filtering"` - Para datos crudos filtrados
- `phase: "summary"` - Para el resumen consolidado

## Prerrequisitos

- Docker y Docker Compose
- Elasticsearch y Kibana ejecutándose (puerto 9200 y 5601)
- Node.js 18+ (para desarrollo local)
- Datos procesados por Apache Pig en `pig/output/`

## Instalación y Configuración

### 1. Variables de Entorno

El archivo `.env` contiene las configuraciones necesarias:

```bash
ELASTICSEARCH_HOST=http://localhost:9200
ES_INDEX=waze-events
ES_CACHE_INDEX=waze-cache-metrics
ES_PIG_INDEX=waze-pig-metrics
PORT=3000
CACHE_SIZE=150
TIME_INTERVAL_MS=100
```

### 2. Dependencias

```bash
cd visualization
npm install
```

### 3. Estructura de Archivos

```
visualization/
├── pig-indexer.js              # Script de indexación principal
├── pig-metrics-mapping.json    # Mapping de Elasticsearch
├── kibana-pig-exports/         # Visualizaciones de Kibana
│   ├── pig-incidents-by-type.json
│   ├── pig-incidents-by-city.json
│   ├── pig-summary-metrics.json
│   ├── pig-filtering-timeseries.json
│   ├── pig-top-streets.json
│   └── pig-filtering-analysis-dashboard.json
├── server.js                   # API REST endpoints
└── package.json
```

## Uso

### 1. Indexación de Datos

Para indexar los datos de Pig en Elasticsearch:

```bash
# Ejecutar el indexador
cd visualization
node pig-indexer.js
```

El script:
- Crea el índice `waze-pig-metrics` con el mapping apropiado
- Indexa análisis por tipo y ciudad como `phase: "analysis"`
- Indexa datos filtrados como `phase: "filtering"` con timestamps incrementales
- Indexa el resumen como `phase: "summary"`
- Usa bulk indexing para optimizar el rendimiento

### 2. Ejecución con Docker

```bash
# Desde la raíz del proyecto
docker-compose up visualization
```

### 3. Importar Visualizaciones en Kibana

1. Accede a Kibana en `http://localhost:5601`
2. Ve a **Stack Management > Saved Objects**
3. Importa cada archivo JSON de `kibana-pig-exports/`:

```bash
# Importar visualizaciones individuales
pig-incidents-by-type.json      # Bar chart por tipo de incidente
pig-incidents-by-city.json      # Bar chart por ciudad
pig-summary-metrics.json        # Tabla de métricas resumen
pig-filtering-timeseries.json   # Serie temporal de filtrado
pig-top-streets.json           # Top 10 calles con más incidentes

# Importar dashboard completo
pig-filtering-analysis-dashboard.json
```

4. Crear Data View:
   - Ve a **Stack Management > Data Views**
   - Crea un data view para el índice `waze-pig-metrics`
   - Usar `timestamp` como campo de tiempo

## Visualizaciones Disponibles

### 1. Dashboard: "Pig Filtering & Analysis"

Dashboard principal que agrupa todas las visualizaciones:

- **Incidents by Type**: Bar chart mostrando frecuencia por tipo de incidente
- **Incidents by City**: Bar chart mostrando incidentes por ciudad
- **Summary Metrics**: Tabla con métricas consolidadas (total eventos, tipos únicos, ciudades)
- **Filtering Timeline**: Serie temporal simulada del proceso de filtrado
- **Top Streets**: Las 10 calles con mayor número de incidentes

### 2. Métricas Incluidas

- Total de incidentes procesados
- Tipos de incidentes únicos
- Ciudades únicas
- Distribución por tipo (JAM, HAZARD, POLICE, etc.)
- Distribución geográfica por ciudad
- Timeline del proceso de filtrado
- Top calles por volumen de incidentes

## API REST Endpoints

El servidor expone endpoints para acceder a los datos programáticamente:

```
GET /api/pig/analysis/types     # Análisis por tipo
GET /api/pig/analysis/cities    # Análisis por ciudad
GET /api/pig/summary           # Resumen consolidado
GET /api/pig/timeseries        # Serie temporal de filtrado
GET /api/pig/top-streets       # Top 10 calles
```

### Ejemplo de uso:

```bash
curl http://localhost:3000/api/pig/analysis/types
curl http://localhost:3000/api/pig/summary
```

## Estructura de Datos

### Analysis Phase (`phase: "analysis"`)

```json
{
  "phase": "analysis",
  "analysis_type": "incident_frequency_by_type",
  "timestamp": "2025-06-03T02:04:13Z",
  "type": "JAM",
  "frequency": 2833,
  "total_incidents": 7079
}
```

### Filtering Phase (`phase: "filtering"`)

```json
{
  "phase": "filtering",
  "timestamp": "2025-06-30T10:00:01.000Z",
  "eventId": "alert_alert-1852588833/260e67cb-f346-4b5c-a9c3-f448edd40923",
  "type": "HAZARD",
  "city": "Santiago",
  "street": "Santo Domingo",
  "severity": 0,
  "confidence": 0
}
```

### Summary Phase (`phase: "summary"`)

```json
{
  "phase": "summary",
  "timestamp": "2025-06-03T02:04:13Z",
  "unique_incident_types": 6,
  "unique_cities": 10,
  "total_incidents_processed": 7079
}
```

## Integración con Docker Compose

El servicio está configurado en `docker-compose.yml`:

```yaml
visualization:
  build: ./visualization
  ports:
    - "3000:3000"
  environment:
    - ELASTICSEARCH_HOST=http://elasticsearch:9200
    - ES_PIG_INDEX=waze-pig-metrics
  depends_on:
    - elasticsearch
  volumes:
    - ./pig/output:/pig/output:ro
```

## Troubleshooting

### Error de conexión a Elasticsearch

```bash
# Verificar que Elasticsearch esté funcionando
curl http://localhost:9200/_cluster/health

# Verificar variables de entorno
echo $ELASTICSEARCH_HOST
```

### Datos no aparecen en Kibana

1. Verificar que el índice existe:
```bash
curl http://localhost:9200/waze-pig-metrics/_count
```

2. Verificar el data view en Kibana
3. Revisar el rango de tiempo en las visualizaciones

### Problemas con visualizaciones

1. Verificar que el data view apunta al índice correcto
2. Refrescar el data view si cambia el mapping
3. Verificar filtros de tiempo en las visualizaciones

## Desarrollo

### Estructura del Código

- `pig-indexer.js`: Lógica principal de indexación
- `pig-metrics-mapping.json`: Schema de Elasticsearch
- `server.js`: API REST para exponer datos
- `kibana-pig-exports/`: Configuraciones de visualización

### Añadir nuevas visualizaciones

1. Crear la visualización en Kibana UI
2. Exportar desde **Stack Management > Saved Objects**
3. Añadir el JSON exportado a `kibana-pig-exports/`
4. Actualizar el dashboard principal

## Performance

- **Bulk indexing**: Procesa en lotes de 500 documentos
- **Time simulation**: Incrementos de 1 segundo entre eventos para crear serie temporal
- **Memory efficient**: Procesa archivos línea por línea para datasets grandes

## Límites y Consideraciones

- El archivo `part-m-00000` debe ser válido JSON por línea
- Los timestamps se simulan con incrementos para crear serie temporal
- El volumen máximo recomendado es ~10K documentos por indexación
- Elasticsearch debe tener al menos 2GB RAM para datasets completos

---

## Ejemplo de Ejecución Completa

```bash
# 1. Levantar el stack completo
docker-compose up -d elasticsearch kibana

# 2. Esperar que servicios estén listos
curl -f http://localhost:9200/_cluster/health
curl -f http://localhost:5601/api/status

# 3. Ejecutar análisis de Pig (prerequisito)
cd pig
./scripts/run_analysis.sh

# 4. Indexar datos en Elasticsearch
cd ../visualization
node pig-indexer.js

# 5. Importar visualizaciones en Kibana
# (Manual desde la UI o usando la API de Kibana)

# 6. Acceder al dashboard
# http://localhost:5601/app/dashboards
```

¡El módulo está listo para proporcionar insights completos sobre el proceso de filtrado y análisis de datos de Apache Pig!
