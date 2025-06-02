# Waze Project

Este proyecto tiene como objetivo recolectar, procesar y analizar eventos de Waze utilizando un sistema basado en contenedores Docker. El sistema incluye un scraper para recolectar datos, un sistema de almacenamiento en Redis y un conjunto de políticas para procesar los eventos en caché.

## Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```
docker-compose.yml
README.md
cache/
    Dockerfile
    index.js
    package.json
    data/
        even_distribution.json
        long_tail_distribution.json
    utils/
        distributions.js
        policies.js
        scrape.js
db/
    eventos.db
```

### Descripción de Carpetas y Archivos

- **docker-compose.yml**: Archivo de configuración para orquestar los contenedores Docker.
- **cache/**: Contiene el código fuente del scraper y las utilidades para procesar los datos.
  - **index.js**: Punto de entrada principal del scraper.
  - **utils/**: Contiene las utilidades para la distribución de datos, políticas de procesamiento y scraping.
  - **data/**: Carpeta donde se generan los archivos de salida JSON.
- **db/**: Contiene la base de datos SQLite con los eventos de Waze.

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

## Uso

### 1. Construir y ejecutar los contenedores

> [!NOTE]
> A partir de la entrega 2 del proyecto, se ha implementado un sistema de gestión de contenedores Docker para simplificar la ejecución del proyecto.

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

### 2. Funcionalidades principales

El proyecto realiza las siguientes tareas:

1. **Recolección de eventos de Waze**:
   - Se ejecuta mediante la función `scrape()` en `utils/scrape.js`.

2. **Generación de distribuciones**:
   - `getData()` en `utils/distributions.js` genera dos archivos JSON:
     - `long_tail_distribution.json`
     - `even_distribution.json`

3. **Aplicación de políticas**:
   - `LRU()` y `Random()` en `utils/policies.js` procesan los datos según diferentes políticas.

### 3. Verificar los resultados

Los archivos generados estarán disponibles en la carpeta `cache/data`.