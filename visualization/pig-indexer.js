import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ES_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const ES_INDEX = process.env.ES_PIG_INDEX || 'waze-pig-metrics';
const TIME_INTERVAL_MS = 100; // 100ms entre operaciones simuladas

// Rutas a los archivos de datos de Pig
const PIG_OUTPUT_DIR = '../pig/output';
const ANALYSIS_BY_TYPE_PATH = path.join(PIG_OUTPUT_DIR, 'analysis_by_type.json');
const ANALYSIS_BY_CITY_PATH = path.join(PIG_OUTPUT_DIR, 'analysis_by_city.json');
const CONSOLIDATED_SUMMARY_PATH = path.join(PIG_OUTPUT_DIR, 'consolidated_summary.json');
const FILTERED_RAW_DATA_PATH = path.join(PIG_OUTPUT_DIR, 'filtered_raw_data/part-m-00000');

async function ensurePigIndex(client) {
  try {
    const exists = await client.indices.exists({ index: ES_INDEX });
    if (!exists) {
      const mapping = JSON.parse(fs.readFileSync('./pig-metrics-mapping.json', 'utf-8'));
      await client.indices.create({
        index: ES_INDEX,
        body: mapping
      });
      console.log(`✅ Índice "${ES_INDEX}" creado con mapping.`);
    } else {
      console.log(`ℹ️  Índice "${ES_INDEX}" ya existe.`);
    }
  } catch (error) {
    console.error('❌ Error creando índice:', error);
    throw error;
  }
}

async function indexPigMetrics(client, docs) {
  if (docs.length === 0) return;
  
  const body = docs.flatMap(doc => [
    { index: { _index: ES_INDEX } },
    doc
  ]);
  
  try {
    const bulkResponse = await client.bulk({ 
      refresh: true, 
      body 
    });
    
    // La respuesta puede estar en body o directamente en el objeto
    const response = bulkResponse.body || bulkResponse;
    
    if (response && response.errors) {
      const erroredDocuments = [];
      response.items.forEach((action, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error,
            operation: body[i * 2 + 1]
          });
        }
      });
      console.error('❌ Errores en bulk indexing:', erroredDocuments.slice(0, 5)); // Solo mostrar primeros 5
    } else {
      console.log(`✅ Indexados ${docs.length} documentos de métricas Pig.`);
    }
  } catch (error) {
    console.error('❌ Error en bulk indexing:', error);
    throw error;
  }
}

async function indexAnalysisByType(client) {
  console.log('🔄 Indexando análisis por tipo...');
  
  try {
    const rawData = fs.readFileSync(ANALYSIS_BY_TYPE_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    
    const documents = [];
    const baseTimestamp = new Date(data.timestamp);
    
    // Indexar datos agregados del análisis
    data.data.forEach((item, index) => {
      const doc = {
        ...item,
        phase: 'analysis',
        analysis_type: data.analysis_type,
        timestamp: new Date(baseTimestamp.getTime() + (index * 1000)), // 1 segundo entre documentos
        total_types: data.total_types,
        total_incidents: data.summary.total_incidents,
        most_frequent_type: data.summary.most_frequent_type,
        most_frequent_count: data.summary.most_frequent_count
      };
      documents.push(doc);
    });
    
    // Indexar el resumen como un documento separado
    const summaryDoc = {
      phase: 'analysis_summary',
      analysis_type: data.analysis_type,
      timestamp: baseTimestamp,
      total_types: data.total_types,
      total_incidents: data.summary.total_incidents,
      most_frequent_type: data.summary.most_frequent_type,
      most_frequent_count: data.summary.most_frequent_count
    };
    documents.push(summaryDoc);
    
    await indexPigMetrics(client, documents);
    
    console.log(`✅ Análisis por tipo completado: ${documents.length} documentos`);
    return documents.length;
    
  } catch (error) {
    console.error('❌ Error indexando análisis por tipo:', error);
    throw error;
  }
}

async function indexAnalysisByCity(client) {
  console.log('🔄 Indexando análisis por ciudad...');
  
  try {
    const rawData = fs.readFileSync(ANALYSIS_BY_CITY_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    
    const documents = [];
    const baseTimestamp = new Date(data.timestamp);
    
    // Indexar datos agregados del análisis
    data.data.forEach((item, index) => {
      const doc = {
        city: item.city,
        incidents: item.incidents,
        phase: 'analysis',
        analysis_type: data.analysis_type,
        timestamp: new Date(baseTimestamp.getTime() + (index * 1000)), // 1 segundo entre documentos
        total_cities: data.total_cities,
        total_incidents: data.summary.total_incidents,
        most_active_city: data.summary.most_active_city,
        most_active_count: data.summary.most_active_count,
        average_incidents_per_city: data.summary.average_incidents_per_city
      };
      documents.push(doc);
    });
    
    // Indexar el resumen como un documento separado
    const summaryDoc = {
      phase: 'analysis_summary',
      analysis_type: data.analysis_type,
      timestamp: baseTimestamp,
      total_cities: data.total_cities,
      total_incidents: data.summary.total_incidents,
      most_active_city: data.summary.most_active_city,
      most_active_count: data.summary.most_active_count,
      average_incidents_per_city: data.summary.average_incidents_per_city
    };
    documents.push(summaryDoc);
    
    await indexPigMetrics(client, documents);
    
    console.log(`✅ Análisis por ciudad completado: ${documents.length} documentos`);
    return documents.length;
    
  } catch (error) {
    console.error('❌ Error indexando análisis por ciudad:', error);
    throw error;
  }
}

async function indexConsolidatedSummary(client) {
  console.log('🔄 Indexando resumen consolidado...');
  
  try {
    const rawData = fs.readFileSync(CONSOLIDATED_SUMMARY_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    
    const doc = {
      phase: 'summary',
      timestamp: new Date(data.consolidated_summary.timestamp),
      analysis_files: data.consolidated_summary.analysis_files,
      unique_incident_types: data.consolidated_summary.totals.unique_incident_types,
      unique_cities: data.consolidated_summary.totals.unique_cities,
      total_incidents_processed: data.consolidated_summary.totals.total_incidents_processed
    };
    
    await indexPigMetrics(client, [doc]);
    
    console.log('✅ Resumen consolidado completado: 1 documento');
    return 1;
    
  } catch (error) {
    console.error('❌ Error indexando resumen consolidado:', error);
    throw error;
  }
}

async function indexFilteredRawData(client) {
  console.log('🔄 Indexando datos filtrados...');
  
  try {
    const fileStream = fs.createReadStream(FILTERED_RAW_DATA_PATH);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    const documents = [];
    const batchSize = 1000;
    let operationNumber = 0;
    let totalIndexed = 0;
    const startTime = new Date();
    
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const record = JSON.parse(line);
          operationNumber++;
          
          const doc = {
            ...record,
            phase: 'filtering',
            timestamp: new Date(startTime.getTime() + (operationNumber * TIME_INTERVAL_MS)),
            operation_number: operationNumber
          };
          
          documents.push(doc);
          
          // Indexar en lotes
          if (documents.length >= batchSize) {
            await indexPigMetrics(client, documents);
            totalIndexed += documents.length;
            documents.length = 0; // Limpiar array
            
            if (totalIndexed % 10000 === 0) {
              console.log(`   📊 Procesados ${totalIndexed.toLocaleString()} registros filtrados`);
            }
          }
        } catch (parseError) {
          console.warn(`⚠️  Error parseando línea ${operationNumber}: ${parseError.message}`);
        }
      }
    }
    
    // Indexar el último lote
    if (documents.length > 0) {
      await indexPigMetrics(client, documents);
      totalIndexed += documents.length;
    }
    
    console.log(`✅ Datos filtrados completados: ${totalIndexed.toLocaleString()} documentos`);
    return totalIndexed;
    
  } catch (error) {
    console.error('❌ Error indexando datos filtrados:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando indexación de métricas de Apache Pig...');
  
  try {
    const client = new Client({ node: ES_HOST });
    console.log(`🔗 Conectando a Elasticsearch en ${ES_HOST}`);
    
    // Verificar conexión
    await client.ping();
    console.log('✅ Conexión a Elasticsearch exitosa');
    
    await ensurePigIndex(client);
    
    // Verificar que los archivos existen
    const requiredFiles = [
      ANALYSIS_BY_TYPE_PATH,
      ANALYSIS_BY_CITY_PATH,
      CONSOLIDATED_SUMMARY_PATH,
      FILTERED_RAW_DATA_PATH
    ];
    
    for (const filePath of requiredFiles) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`❌ Archivo requerido no encontrado: ${filePath}`);
      }
    }
    
    const stats = {
      analysisType: 0,
      analysisCity: 0,
      summary: 0,
      filteredData: 0
    };
    
    // Ejecutar indexación de cada fase
    console.log('\n📋 Ejecutando indexación por fases...\n');
    
    stats.analysisType = await indexAnalysisByType(client);
    stats.analysisCity = await indexAnalysisByCity(client);
    stats.summary = await indexConsolidatedSummary(client);
    stats.filteredData = await indexFilteredRawData(client);
    
    const totalDocs = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log('==================');
    console.log(`📈 Análisis por tipo: ${stats.analysisType.toLocaleString()} documentos`);
    console.log(`🏙️  Análisis por ciudad: ${stats.analysisCity.toLocaleString()} documentos`);
    console.log(`📋 Resumen consolidado: ${stats.summary.toLocaleString()} documentos`);
    console.log(`🔍 Datos filtrados: ${stats.filteredData.toLocaleString()} documentos`);
    console.log(`📊 TOTAL: ${totalDocs.toLocaleString()} documentos indexados`);
    
    console.log('\n✅ Indexación de Pig completada exitosamente!');
    console.log(`🔍 Visualiza los datos en Kibana: ${ES_HOST.replace('9200', '5601')}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso principal:', error);
    process.exit(1);
  }
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
