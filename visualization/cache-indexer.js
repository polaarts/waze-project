import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const ES_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const ES_INDEX = process.env.ES_CACHE_INDEX || 'waze-cache-metrics';
const CACHE_SIZE = 150;
const TIME_INTERVAL_MS = 100; // 100ms entre operaciones

class CacheSimulator {
  constructor(capacity, policy) {
    this.capacity = capacity;
    this.policy = policy;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.operations = 0;
  }

  access(eventId) {
    this.operations++;
    
    if (this.policy === 'LRU') {
      return this.accessLRU(eventId);
    } else if (this.policy === 'Random') {
      return this.accessRandom(eventId);
    }
  }

  accessLRU(eventId) {
    if (this.cache.has(eventId)) {
      // Hit: mover al final (más reciente)
      const value = this.cache.get(eventId);
      this.cache.delete(eventId);
      this.cache.set(eventId, value);
      this.hits++;
      return 'hit';
    } else {
      // Miss: agregar nuevo elemento
      if (this.cache.size >= this.capacity) {
        // Eliminar el menos reciente (primero en el Map)
        const lruKey = this.cache.keys().next().value;
        this.cache.delete(lruKey);
      }
      this.cache.set(eventId, true);
      this.misses++;
      return 'miss';
    }
  }

  accessRandom(eventId) {
    if (this.cache.has(eventId)) {
      // Hit
      this.hits++;
      return 'hit';
    } else {
      // Miss: agregar nuevo elemento
      if (this.cache.size >= this.capacity) {
        // Eliminar elemento aleatorio
        const keys = Array.from(this.cache.keys());
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.cache.delete(randomKey);
      }
      this.cache.set(eventId, true);
      this.misses++;
      return 'miss';
    }
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      operations: this.operations,
      hit_rate: this.operations > 0 ? (this.hits / this.operations) : 0,
      cache_size: this.cache.size
    };
  }
}

async function ensureCacheIndex(client) {
  try {
    const exists = await client.indices.exists({ index: ES_INDEX });
    if (!exists) {
      const mapping = JSON.parse(fs.readFileSync('./cache-metrics-mapping.json', 'utf-8'));
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

async function indexCacheMetrics(client, docs) {
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
      console.log(`✅ Indexados ${docs.length} documentos de métricas.`);
    }
  } catch (error) {
    console.error('❌ Error en bulk indexing:', error);
    throw error;
  }
}

async function simulateAndIndex(client, dataPath, distribution, policy) {
  console.log(`🔄 Simulando ${policy} con distribución ${distribution}...`);
  
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);
    
    const simulator = new CacheSimulator(CACHE_SIZE, policy);
    const documents = [];
    const startTime = new Date();
    
    let batchSize = 1000;
    let batchCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const event = data[i];
      const operation = simulator.access(event.eventId);
      const stats = simulator.getStats();
      
      const timestamp = new Date(startTime.getTime() + (i * TIME_INTERVAL_MS));
      
      const doc = {
        policy: policy,
        distribution: distribution,
        operation: operation,
        timestamp: timestamp,
        eventId: event.eventId,
        operation_number: i + 1,
        cache_size: stats.cache_size,
        hit_rate: stats.hit_rate,
        total_operations: stats.operations,
        total_hits: stats.hits,
        total_misses: stats.misses,
        event_type: event.type,
        city: event.city,
        street: event.street
      };
      
      documents.push(doc);
      
      // Indexar en lotes
      if (documents.length >= batchSize) {
        await indexCacheMetrics(client, documents);
        documents.length = 0; // Limpiar array
        batchCount++;
        
        if (batchCount % 10 === 0) {
          console.log(`   📊 Procesadas ${(batchCount * batchSize).toLocaleString()} operaciones de ${data.length.toLocaleString()}`);
        }
      }
    }
    
    // Indexar el último lote
    if (documents.length > 0) {
      await indexCacheMetrics(client, documents);
    }
    
    const finalStats = simulator.getStats();
    console.log(`✅ Simulación ${policy}-${distribution} completada:`);
    console.log(`   📈 Total operaciones: ${finalStats.operations.toLocaleString()}`);
    console.log(`   🎯 Hits: ${finalStats.hits.toLocaleString()}`);
    console.log(`   ❌ Misses: ${finalStats.misses.toLocaleString()}`);
    console.log(`   📊 Tasa de aciertos: ${(finalStats.hit_rate * 100).toFixed(2)}%`);
    console.log(`   💾 Tamaño final caché: ${finalStats.cache_size}`);
    
    return finalStats;
    
  } catch (error) {
    console.error(`❌ Error simulando ${policy}-${distribution}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando indexación de métricas de caché...');
  
  try {
    const client = new Client({ node: ES_HOST });
    console.log(`🔗 Conectando a Elasticsearch en ${ES_HOST}`);
    
    // Verificar conexión
    await client.ping();
    console.log('✅ Conexión a Elasticsearch exitosa');
    
    await ensureCacheIndex(client);
    
    // Paths a los archivos de datos
    const longTailPath = '../cache/data/long_tail_distribution.json';
    const evenDistPath = '../cache/data/even_distribution.json';
    
    // Verificar que los archivos existen
    if (!fs.existsSync(longTailPath) || !fs.existsSync(evenDistPath)) {
      throw new Error('❌ Archivos de datos no encontrados. Ejecuta primero el simulador de caché.');
    }
    
    const allStats = {};
    
    // Simular todas las combinaciones
    console.log('\n📋 Ejecutando simulaciones...\n');
    
    allStats['LRU-long_tail'] = await simulateAndIndex(client, longTailPath, 'long_tail', 'LRU');
    allStats['LRU-uniform'] = await simulateAndIndex(client, evenDistPath, 'uniform', 'LRU');
    allStats['Random-long_tail'] = await simulateAndIndex(client, longTailPath, 'long_tail', 'Random');
    allStats['Random-uniform'] = await simulateAndIndex(client, evenDistPath, 'uniform', 'Random');
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log('==================');
    Object.entries(allStats).forEach(([key, stats]) => {
      console.log(`${key}: ${(stats.hit_rate * 100).toFixed(2)}% hit rate (${stats.hits}/${stats.operations})`);
    });
    
    console.log('\n✅ Indexación completada exitosamente!');
    console.log(`🔍 Visualiza los datos en Kibana: ${ES_HOST.replace('9200', '5601')}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso principal:', error);
    process.exit(1);
  }
}

// Permitir ejecutar con argumentos para simulaciones específicas
if (process.argv.length > 2) {
  const policy = process.argv[2];
  const distribution = process.argv[3];
  
  if (!['LRU', 'Random'].includes(policy) || !['long_tail', 'uniform'].includes(distribution)) {
    console.error('❌ Uso: node cache-indexer.js [LRU|Random] [long_tail|uniform]');
    process.exit(1);
  }
  
  // Ejecutar simulación específica
  // ... implementar lógica específica si se necesita
}

export { main, CacheSimulator };

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
