import { createClient } from 'redis'; 
import fs from 'fs';

export async function cacheLRU() {
  // Configuración
  const MAX_KEYS = 150; // Límite de llaves en caché
  const LongTailData = '../../../output/long_tail_distribution.json';
  const EvenData = '../../../output/even_distribution.json';
  const redisPort = 6379;

  // Clase para implementar la política LRU
  class LRUCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.cache = new Map(); // Usamos Map para mantener el orden de inserción/actualización
    }

    // Verifica si una clave existe
    has(key) {
      return this.cache.has(key);
    }

    // Obtiene un valor y lo mueve al final (más reciente)
    get(key) {
      if (!this.cache.has(key)) return null;
      
      // Remover y re-insertar para actualizar la posición
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      
      return value;
    }

    // Añade o actualiza un valor
    put(key, value) {
      // Si la clave ya existe, la removemos primero
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      // Si estamos en capacidad, eliminamos la clave menos usada recientemente
      else if (this.cache.size >= this.capacity) {
        // La clave menos usada recientemente es la primera en el Map
        const lruKey = this.cache.keys().next().value;
        this.cache.delete(lruKey);
      }
      
      // Insertar la nueva clave (irá al final del Map)
      this.cache.set(key, value);
    }

    // Elimina una clave específica
    delete(key) {
      this.cache.delete(key);
    }

    // Obtiene todas las claves como array
    keys() {
      return Array.from(this.cache.keys());
    }

    // Obtiene el tamaño actual
    get size() {
      return this.cache.size;
    }
  }

  // Función para manejar una distribución con política LRU
  async function handleDistributionLRU(dataFilePath, distributionName) {
    let data;
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Error leyendo o parseando ${dataFilePath}:`, err);
      process.exit(1);
    }

    // Crear cliente Redis
    const client = await createClient({
      url: `redis://localhost:${redisPort}`
    }).on('error', err => console.log('Redis Client Error', err)).connect();
    
    await client.flushDb();
    console.log(`Conectado a Redis en puerto ${redisPort} (Política LRU)`);
    
    // Inicializar caché LRU
    const lruCache = new LRUCache(MAX_KEYS);
    let hits = 0;
    let misses = 0;
    
    // Mientras queden elementos en el array
    while (data.length > 0) {
      // Seleccionar un índice aleatorio
      const idx = Math.floor(Math.random() * data.length);
      const item = data.splice(idx, 1)[0];
      const key = item.id;
      
      // Primero verificamos en nuestro seguimiento LRU
      if (lruCache.has(key)) {
        // Actualizar la posición en LRU para marcar como recientemente usado
        lruCache.get(key);
        hits++;
        
        // Verificamos que también esté en Redis (debería estar siempre)
        const exists = await client.get(`${key}`);
        if (!exists) {
          // Inconsistencia, actualizamos Redis
          await client.set(`${key}`, JSON.stringify(item));
        }
      } else {
        misses++;
        
        // Si la caché LRU está llena, eliminamos la clave menos usada recientemente
        if (lruCache.size >= MAX_KEYS) {
          // La clave menos usada recientemente es la primera en el Map
          const lruKey = lruCache.keys()[0];
          
          // Eliminar de Redis
          await client.del(`${lruKey}`);
          
          // Ya se eliminará de la caché LRU al hacer el put
        }
        
        // Insertar en Redis y en nuestra caché LRU
        await client.set(`${key}`, JSON.stringify(item));
        lruCache.put(key, true); // Solo guardamos la existencia en nuestra caché LRU
      }
    }
    
    console.log(`\n--- Resultado de la simulación Distribución ${distributionName} con política LRU ---`);
    console.log(`Total de operaciones: ${hits + misses}`);
    console.log(`Hits: ${hits}`);
    console.log(`Misses: ${misses}`);
    console.log(`Hit Rate: ${(hits / (hits + misses) * 100).toFixed(2)}%`);
    console.log(`Total de llaves en caché: ${lruCache.size}`);
    
    await client.flushDb();
    await client.disconnect();
    console.log('Desconectado de Redis.');
  }

  // Procesar distribución de cola larga con LRU
  await handleDistributionLRU(LongTailData, "cola larga");
  
  // Procesar distribución uniforme con LRU
  await handleDistributionLRU(EvenData, "uniforme");
}

cacheLRU();