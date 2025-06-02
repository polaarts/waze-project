-- =======================================================================
-- PASO 1: CARGAR DATOS FILTRADOS DESDE EL ARCHIVO JSONL
-- =======================================================================
raw_events = LOAD 'pig/output/filtered_raw_data/part-m-00000' AS (json_line:chararray);

-- Parsear los campos JSON manualmente usando patrones más simples
parsed_events = FOREACH raw_events GENERATE
    REGEX_EXTRACT(json_line, '"id":(\\d+)', 1)              AS id:chararray,
    REGEX_EXTRACT(json_line, '"type":"([^"]*)"', 1)        AS type:chararray,
    REGEX_EXTRACT(json_line, '"city":"([^"]*)"', 1)        AS city:chararray,
    REGEX_EXTRACT(json_line, '"severity":(\\d+)', 1)       AS severity:chararray;

-- Filtrar registros válidos
valid_events = FILTER parsed_events BY 
    id IS NOT NULL AND id != '' AND
    type IS NOT NULL AND type != '' AND
    city IS NOT NULL AND city != '';

-- =======================================================================
-- ANÁLISIS 1: ESTADÍSTICAS BÁSICAS
-- =======================================================================

-- Total de eventos válidos
total_events_group = GROUP valid_events ALL;
total_stats = FOREACH total_events_group GENERATE COUNT(valid_events) AS total_events;

-- =======================================================================
-- ANÁLISIS 2: ANÁLISIS POR CIUDAD
-- =======================================================================

-- Agrupar por ciudad
events_by_city = GROUP valid_events BY city;

-- Contar eventos por ciudad
city_analysis = FOREACH events_by_city GENERATE
    group AS city_name,
    COUNT(valid_events) AS total_incidents;

-- =======================================================================
-- ANÁLISIS 3: ANÁLISIS POR TIPO
-- =======================================================================

-- Agrupar por tipo de incidente
events_by_type = GROUP valid_events BY type;

-- Contar frecuencia de cada tipo
type_frequency = FOREACH events_by_type GENERATE
    group AS incident_type,
    COUNT(valid_events) AS frequency;

-- =======================================================================
-- GUARDAR RESULTADOS
-- =======================================================================

STORE city_analysis       INTO 'pig/output/analysis_by_city'         USING PigStorage('\t');
STORE type_frequency      INTO 'pig/output/analysis_by_type'         USING PigStorage('\t');

