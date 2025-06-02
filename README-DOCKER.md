# 🚗 Proyecto Waze - Sistema Distribuido Dockerizado

Este proyecto permite recolectar, procesar y analizar eventos de Waze utilizando un sistema completamente dockerizado con dos módulos principales:

- **🗂️ Módulo Cache**: Scraper de datos + Redis
- **🐷 Módulo Pig**: Procesamiento distribuido con Apache Pig + Hadoop

## 🚀 Inicio Rápido

### 1. Construir todos los contenedores

```bash
docker-compose build
```

### 2. Ejecutar módulos específicos

#### Módulo Cache (Scraper + Redis)
```bash
# Levantar solo el módulo cache
docker-compose up cache redis -d

# Ver logs del scraper
docker-compose logs -f cache

# Verificar datos en Redis
docker exec -it waze-redis redis-cli keys "*"
```

#### Módulo Pig (Procesamiento Distribuido)
```bash
# Levantar el módulo pig
docker-compose up pig -d

# Ejecutar filtrado de datos
docker exec -it waze-pig bash /app/scripts/run_filtering.sh

# Ejecutar análisis geográfico
docker exec -it waze-pig bash /app/scripts/run_analysis.sh

# Acceso interactivo al contenedor
docker exec -it waze-pig bash
```

## 📋 Comandos Principales

### Módulo Cache
```bash
# Construir solo el módulo cache
docker-compose build cache

# Ejecutar scraper una vez
docker-compose run --rm cache node index.js

# Ver datos recolectados
ls -la cache/data/
```

### Módulo Pig
```bash
# Construir solo el módulo pig
docker-compose build pig

# Ejecutar script Pig directamente
docker exec -it waze-pig pig -f /app/pig/scripts/filtering.pig
docker exec -it waze-pig pig -f /app/pig/scripts/analysis_geographic_patterns.pig

# Generar CSV desde base de datos
docker exec -it waze-pig bash /app/pig/scripts/generate_csv_from_db.sh
```

## 📁 Estructura de Archivos

```
waze-project/
├── docker-compose.yml          # Orquestación de contenedores
├── cache/                      # Módulo de recolección
│   ├── Dockerfile
│   ├── index.js               # Scraper principal
│   ├── data/                  # Archivos generados
│   └── utils/                 # Utilidades del scraper
├── pig/                       # Módulo de procesamiento
│   ├── Dockerfile
│   ├── filtering.pig          # Script de filtrado
│   ├── analysis_geographic_patterns.pig  # Análisis geográfico
│   ├── scripts/               # Scripts de ejecución
│   ├── config/                # Configuraciones Hadoop/Pig
│   └── output/                # Resultados de procesamiento
└── db/                        # Base de datos SQLite
    └── eventos.db
```

## 🔧 Configuración

### Variables de Entorno

El proyecto está preconfigurado, pero puedes modificar:

- **Redis**: Puerto 6379 (por defecto)
- **Java**: OpenJDK 8 (requerido para Pig)
- **Hadoop**: Modo local (sin cluster)

### Volúmenes Docker

- `./cache:/app/cache` - Datos del scraper
- `./pig:/app/pig` - Scripts y configuraciones Pig
- `./db:/app/db` - Base de datos SQLite
- `redis-data` - Persistencia Redis
- `pig-output` - Resultados de procesamiento

## 📊 Resultados

### Módulo Cache
- `cache/data/even_distribution.json`
- `cache/data/long_tail_distribution.json`

### Módulo Pig
- `pig/output/filtered_raw_data/` - Datos filtrados
- `pig/output/analysis_by_city/` - Análisis por ciudad
- `pig/output/analysis_by_type/` - Análisis por tipo de incidente
- `pig/output/analysis_total_stats/` - Estadísticas generales

## 🐛 Troubleshooting

### Problemas comunes

1. **Error "Job in state DEFINE"**:
   ```bash
   # Usar Java 8 específicamente
   docker exec -it waze-pig bash -c "export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64 && pig -f /app/pig/scripts/analysis_geographic_patterns.pig"
   ```

2. **Permisos de archivos**:
   ```bash
   sudo chmod +x pig/scripts/*.sh
   sudo chmod +x pig/*.sh
   ```

3. **Limpiar outputs**:
   ```bash
   docker exec -it waze-pig rm -rf /app/pig/output/analysis_*
   ```

## 🏁 Flujo de Trabajo Completo

```bash
# 1. Construir proyecto
docker-compose build

# 2. Recolectar datos (módulo cache)
docker-compose up cache redis -d
sleep 30  # Esperar que termine la recolección

# 3. Procesar datos (módulo pig)
docker-compose up pig -d
docker exec -it waze-pig bash /app/scripts/run_filtering.sh
docker exec -it waze-pig bash /app/scripts/run_analysis.sh

# 4. Ver resultados
docker exec -it waze-pig ls -la /app/pig/output/
```

## 📈 Monitoreo

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver estado de contenedores
docker-compose ps

# Ver uso de recursos
docker stats waze-cache waze-pig waze-redis
```
