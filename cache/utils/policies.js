import { createClient } from 'redis'; 
import fs from 'fs';

export async function LRU() {
  const MAX_KEYS = 150;
  const LongTailData = '/cache/data/long_tail_distribution.json';
  const EvenData = '/cache/data/even_distribution.json';
  const redisPort = 6379;

  class LRUCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.cache = new Map(); 
    }

    has(key) {
      return this.cache.has(key);
    }

    get(key) {
      if (!this.cache.has(key)) return null;
      
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      
      return value;
    }

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

    delete(key) {
      this.cache.delete(key);
    }

    keys() {
      return Array.from(this.cache.keys());
    }

    get size() {
      return this.cache.size;
    }
  }

  async function handleDistributionLRU(dataFilePath, distributionName) {
    let data;
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Error leyendo o parseando ${dataFilePath}:`, err);
      throw new Error(`Failed to read or parse file ${dataFilePath}: ${err.message}`);
    }

    const client = await createClient({
      url: `redis://redis:${redisPort}` 
    }).on('error', err => console.log('Redis Client Error', err)).connect();
    
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
    console.log(`Hits: ${hits}`);
    console.log(`Misses: ${misses}`);
    console.log(`Hit Rate: ${(hits / (hits + misses) * 100).toFixed(2)}%`);
    console.log(`Total de llaves en caché: ${lruCache.size}`);
    
    await client.flushDb();
    await client.disconnect();
    console.log('Desconectado de Redis.');
  }

  await handleDistributionLRU(LongTailData, "cola larga");
  await handleDistributionLRU(EvenData, "uniforme");
}


export async function Random() {
  const MAX_KEYS = 150;
  const LongTailData = '/cache/data/long_tail_distribution.json';
  const EvenData = '/cache/data/even_distribution.json';
  const redisPort = 6379;

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
    }).on('error', err => console.log('Redis Client Error', err)).connect();

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
    console.log(`Hits: ${hits}`);
    console.log(`Misses: ${misses}`);
    console.log(`Hit Rate: ${(hits / (hits + misses) * 100).toFixed(2)}%`);
    console.log(`Total de llaves en caché: ${cachedKeys.length}`);
    
    await client.flushDb();
    await client.disconnect();
    console.log('Desconectado de Redis.');
  }

  await handleDistribution(LongTailData, "cola larga");
  await handleDistribution(EvenData, "uniforme");
}
