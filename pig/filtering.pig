-- =======================================================================
-- SCRIPT DE FILTRADO DE DATOS WAZE
-- Objetivo: Limpiar registros erróneos de la base de datos eventos.db
-- Fecha: Mayo 2025
-- =======================================================================

-- Registrar los JARs necesarios para Avro (comentados por compatibilidad)
-- REGISTER '/opt/pig/lib/avro*.jar';
-- REGISTER '/opt/pig/lib/jackson-core-asl*.jar';
-- REGISTER '/opt/pig/lib/jackson-mapper-asl*.jar';

-- =======================================================================
-- PASO 1: CARGAR DATOS DESDE EL ARCHIVO CSV COMO CHARARRAY
-- =======================================================================
raw_data_char = LOAD 'pig/input_data.csv' 
    USING PigStorage(',') AS (
        id:chararray,
        collection:chararray,
        type:chararray,
        city:chararray,
        street:chararray,
        severity:chararray,
        reportBy:chararray,
        confidence:chararray,
        eventId:chararray
    );

-- Remover la línea de headers del CSV
data_without_headers = FILTER raw_data_char BY id != 'id';

-- =======================================================================
-- PASO 1.1: CONVERTIR TIPOS DE DATOS
-- =======================================================================
typed_data = FOREACH data_without_headers GENERATE
    (int)id AS id,
    collection,
    type,
    city,
    street,
    (int)severity AS severity,
    reportBy,
    (int)confidence AS confidence,
    eventId;

-- =======================================================================
-- PASO 2: APLICAR FILTROS PARA ELIMINAR REGISTROS ERRÓNEOS
-- =======================================================================

clean_data = FILTER typed_data BY 
    -- CONDICIÓN 1: city debe tener valor válido
    (city IS NOT NULL AND 
     TRIM(city) != '' AND 
     TRIM(city) != '""' AND 
     TRIM(city) != 'NULL') 
    AND
    -- CONDICIÓN 2: type NO debe ser "NONE"
    (type IS NOT NULL AND 
     UPPER(TRIM(type)) != 'NONE')
    AND
    -- CONDICIÓN 3: street debe tener valor (no NULL)
    (street IS NOT NULL AND 
     TRIM(street) != '' AND 
     TRIM(street) != 'NULL');

-- =======================================================================
-- PASO 3: LIMPIAR Y NORMALIZAR DATOS RESTANTES
-- =======================================================================

normalized_data = FOREACH clean_data GENERATE
    id,
    collection,
    TRIM(UPPER(type)) AS type_clean,
    TRIM(REPLACE(city, '"', '')) AS city_clean,
    TRIM(REPLACE(street, '"', '')) AS street_clean,
    severity,
    TRIM(REPLACE(reportBy, '"', '')) AS reportBy_clean,
    confidence,
    TRIM(REPLACE(eventId, '"', '')) AS eventId_clean;

-- =======================================================================
-- PASO 4: GENERAR ESTADÍSTICAS DE FILTRADO
-- =======================================================================

original_count = FOREACH (GROUP data_without_headers ALL) GENERATE COUNT(data_without_headers) AS original_total;
filtered_count = FOREACH (GROUP normalized_data ALL) GENERATE COUNT(normalized_data) AS filtered_total;

DUMP original_count;
DUMP filtered_count;

-- =======================================================================
-- PASO 5: FORMATEAR DATOS COMO JSON MANTENIENDO ESQUEMA AVRO
-- =======================================================================

filtered_with_schema = FOREACH normalized_data GENERATE
    id,
    collection,
    type_clean AS type,
    city_clean AS city,
    street_clean AS street,
    severity,
    reportBy_clean AS reportBy,
    confidence,
    eventId_clean AS eventId;

-- Preparar datos con esquema JSON equivalente al Avro
json_formatted_data = FOREACH filtered_with_schema GENERATE
    CONCAT('{"id":', (chararray)id, 
           ',"collection":', (collection IS NULL OR TRIM(collection) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(collection), '"', '\\"'), '"')),
           ',"type":', (type IS NULL OR TRIM(type) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(type), '"', '\\"'), '"')),
           ',"city":', (city IS NULL OR TRIM(city) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(city), '"', '\\"'), '"')),
           ',"street":', (street IS NULL OR TRIM(street) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(street), '"', '\\"'), '"')),
           ',"severity":', (severity IS NULL ? 'null' : (chararray)severity),
           ',"reportBy":', (reportBy IS NULL OR TRIM(reportBy) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(reportBy), '"', '\\"'), '"')),
           ',"confidence":', (confidence IS NULL ? 'null' : (chararray)confidence),
           ',"eventId":', (eventId IS NULL OR TRIM(eventId) == '' ? 'null' : CONCAT('"', REPLACE(TRIM(eventId), '"', '\\"'), '"')),
           '}') AS json_record;

STORE json_formatted_data INTO 'pig/output/filtered_raw_data' 
    USING PigStorage();


-- =======================================================================
-- RESUMEN DEL PROCESO DE FILTRADO
-- =======================================================================

/*
CRITERIOS DE FILTRADO APLICADOS:
1. Eliminados registros con city NULL, vacío o ""
2. Eliminados registros con type = "NONE"  
3. Eliminados registros con street NULL o vacío

ESQUEMA JSON EQUIVALENTE AL AVRO:
{
  "id": int,
  "collection": string|null,
  "type": string|null,
  "city": string|null,
  "street": string|null,
  "severity": int|null,
  "reportBy": string|null,
  "confidence": int|null,
  "eventId": string|null
}

*/
