const Redis = require('ioredis');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

const DB_PATH = './eventos.db';
async function connectToDatabase() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    console.log('Successfully connected to SQLite database');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function main() {
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

    // tamaño infinito, distribucion de pareto
    


    // tamaño fijo 1mb, distribucion uniforme, lru

    // tamaño fijo 1mb, distribucion uniforme, random

    // tamaño fijo 1mb, distribucion pareto, lru
    
    // tamaño fijo 1mb, distribucion pareto, random

    // tamaño fijo 50mb, distribucion uniforme, lru

    // tamaño fijo 50mb, distribucion uniforme, random

    // tamaño fijo 50mb, distribucion pareto, lru
    
    // tamaño fijo 50mb, distribucion pareto, random


  }
  main();