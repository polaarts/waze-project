# Waze Project

Este proyecto tiene como objetivo recolectar, procesar y analizar eventos de Waze utilizando un sistema basado en contenedores Docker. El sistema incluye un scraper para recolectar datos, un sistema de almacenamiento en Redis y un conjunto de políticas para procesar los eventos en caché.

> [!NOTE]
> A partir de la entrega 2 del proyecto, se ha implementado un sistema de gestión de contenedores Docker para simplificar la ejecución del proyecto.

## Requisitos Previos

- Docker y Docker Compose instalados en tu sistema.

## Configuración

1. Clona este repositorio:
   ```bash
   git clone <URL del repositorio>
   cd waze-project
   ```

2. Asegúrate de que las carpetas necesarias existan:
   ```bash
   mkdir -p cache/data
   chmod 777 cache/data
   ```

3. Configura el archivo `docker-compose.yml` si es necesario.

Para listar los comandos disponibles para ejecutar los contenedores deseados, utiliza el siguiente comando:

```bash
./manage.sh help
```

Sin embargo, a continuación se detallan los comandos más relevantes:

```bash
./manage.sh build          # Construir todos los contenedores
./manage.sh cache          # Ejecutar el scraper y almacenar datos en Redis
./manage.sh pig-full       # Ejecutar todo el flujo de filtrado y procesamiento con Pig
```

## Estructura del Proyecto

```
waze-project/
├── docker-compose.yml
├── manage.sh
├── README.md
├── cache/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   ├── data/
│   │   ├── even_distribution.json
│   │   └── long_tail_distribution.json
│   └── utils/
│       ├── distributions.js
│       ├── policies.js
│       └── scrape.js
├── pig/
│   ├── Dockerfile
│   ├── config/
│   │   ├── hadoop/
│   │   │   ├── core-site.xml
│   │   │   ├── hdfs-site.xml
│   │   │   ├── mapred-site.xml
│   │   │   └── yarn-site.xml
│   │   └── pig/
│   │       └── pig.properties
│   ├── scripts/
│   │   ├── convert_analysis_to_json.sh
│   │   ├── generate_csv_from_db.sh
│   │   ├── run_filtering.sh
│   │   ├── run_analysis.sh
│   │   └── docker-entrypoint.sh
│   └── output/
│       ├── analysis_by_city.json
│       ├── analysis_by_type.json
│       └── consolidated_summary.json
└── db/
    └── eventos.db
```

## Detalles

### Archivos principales
- **`manage.sh`** - Script de orquestación principal con interfaz de comandos completa.
- **`docker-compose.yml`** - Orquestación de contenedores definiendo tres servicios (cache, redis, pig).

### Módulo Cache (`cache/`)
Contiene el sistema de recolección de datos de Node.js:
- **`index.js`** - Punto de entrada principal del scraper.
- **`utils/scrape.js`** - Funcionalidad de raspado web usando Puppeteer.
- **`data/`** - Archivos de distribución generados para el análisis de políticas de caché.

### Módulo Pig (`pig/`)
Contiene Apache Pig + Hadoop analytics processing:
- **`Dockerfile`** - Crea el entorno Java 8 + Hadoop + Pig.
- **`config/`** - Ficheros de configuración de Hadoop y Pig.
- **`scripts/`** - Scripts de procesamiento y conversión.
- **`output/`** - Resultados de análisis generados en formato JSON.

### Base de datos (`db/`)
- **`eventos.db`** - Base de datos SQLite que almacena los eventos Waze recogidos con un esquema unificado para alertas y atascos de tráfico.