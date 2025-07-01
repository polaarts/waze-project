# 🚀 Cache Performance Visualization - Waze Events

Sistema completo de visualización y análisis de rendimiento para políticas de caché LRU vs Random aplicadas a eventos de Waze.

## 📋 Descripción

Este módulo proporciona:

- **Simulación de caché** con políticas LRU y Random
- **Indexación automática** en Elasticsearch 
- **Dashboard web interactivo** con métricas en tiempo real
- **Visualizaciones Kibana** exportables
- **APIs REST** para acceso a datos

## 🏗️ Arquitectura

```
📁 visualization/
├── 📄 cache-indexer.js           # Script de indexación principal
├── 📄 server.js                  # Servidor Express con APIs
├── 📄 run-cache-viz.sh          # Script de setup automatizado
├── 📁 public/
│   ├── 📄 cache-dashboard.html   # Dashboard web principal
│   ├── 📄 cache-dashboard.js     # Lógica del dashboard
│   └── 📄 index.html            # Dashboard original de eventos
├── 📁 kibana-exports/            # Configuraciones de Kibana
│   ├── 📄 cache-hit-rate-timeseries.json
│   ├── 📄 cache-performance-comparison.json
│   ├── 📄 cache-operations-histogram.json
│   ├── 📄 cache-summary-table.json
│   └── 📄 cache-performance-dashboard.json
└── 📄 cache-metrics-mapping.json # Mapping de Elasticsearch
```

## 🛠️ Requisitos Previos

### Software Requerido

- **Node.js** v18+ y **npm**
- **Elasticsearch** 8.x ejecutándose en `localhost:9200`
- **Kibana** 8.x ejecutándose en `localhost:5601` (opcional)

### Servicios con Docker

```bash
# Elasticsearch
docker run -d --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# Kibana (opcional)
docker run -d --name kibana \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://localhost:9200" \
  kibana:8.11.0
```

## 🚀 Instalación y Configuración

### 1. Setup Automatizado (Recomendado)

```bash
cd visualization/
./run-cache-viz.sh all
```

Este comando ejecuta:
- ✅ Verificación de dependencias
- ✅ Instalación de paquetes npm
- ✅ Verificación de archivos de datos
- ✅ Conexión a Elasticsearch
- ✅ Indexación completa de métricas
- ✅ Configuración de visualizaciones

### 2. Setup Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env según tu configuración

# 3. Generar datos de caché (si no existen)
cd ../cache && npm install && node index.js && cd ../visualization

# 4. Indexar métricas en Elasticsearch
node cache-indexer.js

# 5. Iniciar servidor
npm start
```

## 📊 Uso del Sistema

### Dashboard Web

```bash
# Iniciar servidor
npm start

# Acceder a dashboards
http://localhost:3000              # Dashboard de eventos Waze
http://localhost:3000/cache        # Dashboard de performance de caché
```

### APIs Disponibles

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/cache/aggregated-stats` | Estadísticas agregadas por política/distribución |
| `GET /api/cache/timeseries` | Datos de serie temporal para gráficos |
| `GET /api/cache/raw-search?policy=LRU&distribution=long_tail` | Búsqueda raw con filtros |

### Ejemplo de Respuesta API

```json
{
  "combinations": [
    {
      "policy": "LRU",
      "distribution": "long_tail",
      "avgHitRate": 0.8234,
      "totalOperations": 548605,
      "totalHits": 451456,
      "totalMisses": 97149
    }
  ]
}
```

## 📈 Visualizaciones de Kibana

### Importar Dashboards

1. **Acceder a Kibana**: `http://localhost:5601`
2. **Ir a Stack Management** → Saved Objects
3. **Importar archivos JSON** desde `./kibana-exports/`:
   - `cache-hit-rate-timeseries.json` - Serie temporal de hit rate
   - `cache-performance-comparison.json` - Comparación LRU vs Random
   - `cache-operations-histogram.json` - Distribución de operaciones
   - `cache-summary-table.json` - Tabla resumen
   - `cache-performance-dashboard.json` - Dashboard completo

### Visualizaciones Incluidas

#### 1. 📈 Cache Hit Rate Over Time
- **Tipo**: Serie temporal
- **Métricas**: Hit rate promedio por política y distribución
- **Filtros**: Por política (LRU/Random) y distribución (long_tail/uniform)

#### 2. 📊 Performance Comparison
- **Tipo**: Gráfico de barras
- **Métricas**: Comparación directa de hit rates
- **Agrupación**: Por política y distribución

#### 3. 🔄 Operations Distribution
- **Tipo**: Histograma
- **Métricas**: Conteo de hits vs misses
- **Segmentación**: Por política de caché

#### 4. 📋 Summary Table
- **Tipo**: Tabla
- **Columnas**: Política, Distribución, Hit Rate, Hits, Misses, Total Ops
- **Ordenación**: Por hit rate descendente

## 🎯 Características del Dashboard Web

### Métricas Principales
- **Hit Rate por política** con indicadores visuales
- **Total de operaciones** procesadas
- **Comparación de rendimiento** automática
- **Tamaño de caché** configurado

### Gráficos Interactivos
- **Serie temporal** con filtros en tiempo real
- **Comparación de barras** LRU vs Random
- **Distribución de operaciones** por política
- **Tabla detallada** con métricas completas

### Funcionalidades
- ✅ **Auto-refresh** cada 60 segundos
- ✅ **Filtros dinámicos** para visualizaciones
- ✅ **Responsive design** para móviles
- ✅ **Exportación de datos** (en desarrollo)
- ✅ **Indicadores de estado** y loading

## ⚙️ Configuración Avanzada

### Variables de Entorno (.env)

```bash
# Elasticsearch
ELASTICSEARCH_HOST=http://localhost:9200
ES_CACHE_INDEX=waze-cache-metrics

# Servidor
PORT=3000

# Simulación
CACHE_SIZE=150
TIME_INTERVAL_MS=100
```

### Mapping de Elasticsearch

El mapping está optimizado para consultas de agregación:

```json
{
  "policy": { "type": "keyword" },           // LRU, Random
  "distribution": { "type": "keyword" },     // long_tail, uniform  
  "operation": { "type": "keyword" },        // hit, miss
  "timestamp": { "type": "date" },           // Tiempo de operación
  "hit_rate": { "type": "float" },          // Tasa de aciertos
  "total_operations": { "type": "long" }     // Total de operaciones
}
```

## 🔧 Scripts Disponibles

### Ejecución por Componentes

```bash
# Setup solo dependencias
./run-cache-viz.sh deps

# Verificar solo datos
./run-cache-viz.sh data

# Solo indexación
./run-cache-viz.sh index

# Solo servidor
./run-cache-viz.sh server

# Info de Kibana
./run-cache-viz.sh kibana-info
```

### NPM Scripts

```bash
npm start              # Iniciar servidor
npm run index-cache    # Solo indexación
npm run dev           # Desarrollo con hot-reload
```

## 📊 Métricas y KPIs

### Métricas Principales
- **Hit Rate**: `hits / (hits + misses)`
- **Total Operations**: Número total de accesos simulados
- **Cache Efficiency**: Comparación relativa entre políticas
- **Temporal Patterns**: Evolución del rendimiento en el tiempo

### Resultados Esperados
- **LRU**: Mayor hit rate en distribuciones long tail
- **Random**: Rendimiento más uniforme entre distribuciones
- **Long Tail**: Favorece políticas que mantienen elementos populares
- **Uniform**: Menor diferencia entre políticas

## 🐛 Troubleshooting

### Problemas Comunes

#### Elasticsearch no conecta
```bash
# Verificar estado
curl -X GET "localhost:9200/_cluster/health"

# Reiniciar contenedor
docker restart elasticsearch
```

#### Datos no aparecen
```bash
# Verificar índice
curl -X GET "localhost:9200/waze-cache-metrics/_count"

# Re-indexar
node cache-indexer.js
```

#### Dashboard en blanco
```bash
# Verificar logs del servidor
npm start

# Verificar APIs
curl http://localhost:3000/api/cache/aggregated-stats
```

### Logs y Debugging

```bash
# Logs del indexador
node cache-indexer.js 2>&1 | tee indexing.log

# Logs del servidor
DEBUG=* npm start

# Verificar datos en Elasticsearch
curl -X POST "localhost:9200/waze-cache-metrics/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{"size": 1}'
```

## 🔬 Análisis de Resultados

### Interpretación de Métricas

1. **Hit Rate > 80%**: Excelente rendimiento de caché
2. **Hit Rate 60-80%**: Buen rendimiento
3. **Hit Rate < 60%**: Revisar configuración de caché

### Patrones Esperados

- **LRU + Long Tail**: Mejor rendimiento debido a localidad temporal
- **Random + Uniform**: Rendimiento similar a LRU
- **Cold Start**: Hit rate bajo al inicio, mejora con el tiempo
- **Steady State**: Hit rate estable después de calentamiento

## 🤝 Contribuciones

Para contribuir al proyecto:

1. Fork del repositorio
2. Crear branch para feature: `git checkout -b feature/nueva-metrica`
3. Commit cambios: `git commit -am 'Add nueva métrica'`
4. Push a branch: `git push origin feature/nueva-metrica`
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para detalles.

---

## 📞 Soporte

Para problemas o preguntas:

1. **Issues**: Usar GitHub Issues para bugs y feature requests
2. **Documentación**: Este README y comentarios en código
3. **Logs**: Revisar outputs de scripts y APIs para debugging

---

**🎉 ¡Happy Caching!** 🚀
