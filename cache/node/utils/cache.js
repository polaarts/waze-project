import Redis from 'ioredis';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = './eventos.db';
async function connectToDatabase() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.verbose().Database
    });
    console.log('Successfully connected to SQLite database');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function cache() {
    let timesQueryd = 0;
    let misses = 0;
    let hits = 0;

    let redis;
    try {
    redis = new Redis();
    }
    catch (error) {
        console.error('Redis connection error:', error);
        throw error;
    }
    const db = await connectToDatabase();
    let calentado;
    try {
        calentado = await db.all(`SELECT * FROM eventos limit 1600`);

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
    // tamaño infinito, distribucion uniforme
    for (let i = 0; i < calentado.length; i++) {
        redis.set(`${calentado[i].id}`, JSON.stringify(calentado[i])).catch(console.error);
    }

    const data = JSON.parse(fs.readFileSync('waze_even_data.json', 'utf8'));
    for (const e of data.records) {
        const value = await redis.get(`${e.id}`);
        if (value) {
            hits++;
        } else {
            redis.set(`${e.id}`, JSON.stringify(e)).catch(console.error);
            misses++;
        }
        timesQueryd++;
    }
    console.log(`Para tamaño infinito, distribucion uniforme se tienen \n Hits: ${hits}, Misses: ${misses}, Total queries: ${timesQueryd}`);

    // tamaño infinito, distribucion de pareto
    


    // tamaño fijo 1mb, distribucion uniforme, lru

    // tamaño fijo 1mb, distribucion uniforme, random

    // tamaño fijo 1mb, distribucion pareto, lru
    
    // tamaño fijo 1mb, distribucion pareto, random

    // tamaño fijo 50mb, distribucion uniforme, lru

    // tamaño fijo 50mb, distribucion uniforme, random

    // tamaño fijo 50mb, distribucion pareto, lru
    
    // tamaño fijo 50mb, distribucion pareto, random


}