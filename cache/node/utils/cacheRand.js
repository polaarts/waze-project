import { createClient } from 'redis'; 
import fs from 'fs';

export async function cache() {
  // Configuración
  const MAX_KEYS = 150; // Límite de llaves en caché
  const LongTailData = '../../../output/long_tail_distribution.json';
  const EvenData = '../../../output/even_distribution.json';
  const redisPort = 6379;

  // Función para manejar una distribución
  async function handleDistribution(dataFilePath, distributionName) {
    let data;
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Error leyendo o parseando ${dataFilePath}:`, err);
      process.exit(1);
    }

    // Crear cliente Redis apuntando a localhost y al puerto dado
    const client = await createClient({
      url: `redis://localhost:${redisPort}`
    }).on('error', err => console.log('Redis Client Error', err)).connect();
    
    await client.flushDb();
    console.log(`Conectado a Redis en puerto ${redisPort}`);
    
    // Para seguimiento de las llaves actuales en el caché
    let cachedKeys = [];
    let hits = 0;
    let misses = 0;
    
    // Mientras queden elementos en el array
    while (data.length > 0) {
      // Seleccionar un índice aleatorio
      const idx = Math.floor(Math.random() * data.length);
      const item = data.splice(idx, 1)[0];
      const key = item.id; // ajusta si necesitas otro campo como key
      
      // Verificar si existe en Redis
      const exists = await client.get(`${key}`);
      
      if (exists) {
        hits++;
      } else {
        misses++;
        
        // Verificar si hemos alcanzado el límite de llaves
        if (cachedKeys.length >= MAX_KEYS) {
          // Política de remoción aleatoria: seleccionar una llave al azar para eliminar
          const randomIndex = Math.floor(Math.random() * cachedKeys.length);
          const keyToRemove = cachedKeys[randomIndex];
          
          // Eliminar la llave seleccionada de Redis
          await client.del(keyToRemove);
          
          // Actualizar nuestro seguimiento de llaves
          cachedKeys.splice(randomIndex, 1);
        }
        
        // Insertar en Redis
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

  // Procesar distribución de cola larga
  await handleDistribution(LongTailData, "cola larga");
  
  // Procesar distribución uniforme
  await handleDistribution(EvenData, "uniforme");
}

cache();