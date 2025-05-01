import { createClient } from 'redis'; 
import fs from 'fs';

/**
 * Implementa la simulación de la política de caché LRU (Least Recently Used - Menos Recientemente Usado)
 * Simula el comportamiento del caché contra distribuciones de cola larga y uniformes
 */
export async function LRU() {
  const MAX_KEYS = 150;
  const LongTailData = '/cache/data/long_tail_distribution.json';
  const EvenData = '/cache/data/even_distribution.json';
  const redisPort = 6379;

  /**
   * Implementación de caché LRU utilizando la estructura Map
   * El Map mantiene un orden de inserción, lo que ayuda con la implementación LRU
   */
  class LRUCache {
    /**
     * Crea un nuevo caché LRU con la capacidad especificada
     * @param {number} capacity
     */
    constructor(capacity) {
      this.capacity = capacity;
      this.cache = new Map();
    }

    /**
     * Verifica si la clave existe en el caché
     * @param {string} key 
     * @returns {boolean} 
     */
    has(key) {
      return this.cache.has(key);
    }

    /**
     * Obtiene un elemento del caché y actualiza su posición (más recientemente usado)
     * @param {string} key 
     * @returns {any} 
     */
    get(key) {
      if (!this.cache.has(key)) return null;
      
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      
      return value;
    }

    /**
     * Añade o actualiza un elemento en el caché
     * Si el caché está lleno, elimina el elemento menos recientemente usado
     * @param {string} key 
     * @param {any} value 
     */
    put(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      else if (this.cache.size >= this.capacity) {
        const lruKey = this.cache.keys().next().value;
        this.cache.delete(lruKey);
      }
      
      this.cache.set(key, value);
    }

    /**
     * @param {string} key 
     */
    delete(key) {
      this.cache.delete(key);
    }

    /**
     * @returns {Array}
     */
    keys() {
      return Array.from(this.cache.keys());
    }

    /**
     * @returns {number} 
     */
    get size() {
      return this.cache.size;
    }
  }

  /**
   * Simula el caché LRU con una distribución de datos específica
   * @param {string} dataFilePath
   * @param {string} distributionName 
   */
  async function handleDistributionLRU(dataFilePath, distributionName) {
    let data;
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Error leyendo o parseando ${dataFilePath}:`, err);
      throw new Error(`Error al leer o analizar el archivo ${dataFilePath}: ${err.message}`);
    }

    const client = await createClient({
      url: `redis://redis:${redisPort}` 
    }).on('error', err => console.log('Error del Cliente Redis', err)).connect();
    
    await client.flushDb();
    console.log(`Conectado a Redis en puerto ${redisPort} (Política LRU)`);
    
    const lruCache = new LRUCache(MAX_KEYS);
    let hits = 0;
    let misses = 0;
    
    while (data.length > 0) {
      const idx = Math.floor(Math.random() * data.length);
      const item = data.splice(idx, 1)[0];
      const key = item.id;
      
      if (lruCache.has(key)) {
        lruCache.get(key);
        hits++;
        
        const exists = await client.get(`${key}`);
        if (!exists) {
          await client.set(`${key}`, JSON.stringify(item));
        }
      } else {
        misses++;
        
        if (lruCache.size >= MAX_KEYS) {
          const lruKey = lruCache.keys()[0];
          
          await client.del(`${lruKey}`);          
        }
        
        await client.set(`${key}`, JSON.stringify(item));
        lruCache.put(key, true);
      }
    }
    
    console.log(`\n--- Resultado de la simulación Distribución ${distributionName} con política LRU ---`);
    console.log(`Total de operaciones: ${hits + misses}`);
    console.log(`Aciertos: ${hits}`);
    console.log(`Fallos: ${misses}`);
    console.log(`Tasa de aciertos: ${(hits / (hits + misses) * 100).toFixed(2)}%`);
    console.log(`Total de llaves en caché: ${lruCache.size}`);
    
    await client.flushDb();
    await client.disconnect();
    console.log('Desconectado de Redis.');
  }

  await handleDistributionLRU(LongTailData, "cola larga");
  await handleDistributionLRU(EvenData, "uniforme");
}

/**
 * Implementa la simulación de política de caché Random (Aleatorio)
 * Desaloja entradas aleatorias cuando el caché está lleno
 */
export async function Random() {
  const MAX_KEYS = 150;
  const LongTailData = '/cache/data/long_tail_distribution.json';
  const EvenData = '/cache/data/even_distribution.json';
  const redisPort = 6379;

  /**
   * Simula el caché Random con una distribución de datos específica
   * @param {string} dataFilePath 
   * @param {string} distributionName 
   */
  async function handleDistribution(dataFilePath, distributionName) {
    let data;
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Error leyendo o parseando ${dataFilePath}:`, err);
      process.exit(1);
    }

    const client = await createClient({
      url: `redis://redis:${redisPort}`
    }).on('error', err => console.log('Error del Cliente Redis', err)).connect();

    await client.flushDb();
    console.log(`Conectado a Redis en puerto ${redisPort}`);
    
    let cachedKeys = [];
    let hits = 0;
    let misses = 0;
    
    while (data.length > 0) {
      const idx = Math.floor(Math.random() * data.length);
      const item = data.splice(idx, 1)[0];
      const key = item.id; 
      const exists = await client.get(`${key}`);
      
      if (exists) {
        hits++;
      } else {
        misses++;
        
        if (cachedKeys.length >= MAX_KEYS) {
          const randomIndex = Math.floor(Math.random() * cachedKeys.length);
          const keyToRemove = cachedKeys[randomIndex];
          
          await client.del(keyToRemove);
          
          cachedKeys.splice(randomIndex, 1);
        }
        
        await client.set(`${key}`, JSON.stringify(item));
        cachedKeys.push(`${key}`);
      }
    }
    
    console.log(`\n--- Resultado de la simulación Distribución ${distributionName} con política Random ---`);
    console.log(`Total de operaciones: ${hits + misses}`);
    console.log(`Aciertos: ${hits}`);
    console.log(`Fallos: ${misses}`);
    console.log(`Tasa de aciertos: ${(hits / (hits + misses) * 100).toFixed(2)}%`);
    console.log(`Total de llaves en caché: ${cachedKeys.length}`);
    
    await client.flushDb();
    await client.disconnect();
    console.log('Desconectado de Redis.');
  }

  await handleDistribution(LongTailData, "cola larga");
  await handleDistribution(EvenData, "uniforme");
}
