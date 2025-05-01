import getData from './utils/distributions.js';
import { LRU, Random } from './utils/policies.js'; 
import { scrape } from './utils/scrape.js';

/**
 * Función principal que ejecuta el flujo completo del proceso:
 * 1. Recolecta datos de eventos de Waze
 * 2. Genera distribuciones de datos (cola larga y uniforme)
 * 3. Aplica políticas de caché (LRU y Random)
 */
async function main() {
  try {
    console.log('Iniciando la recolección de eventos de Waze');
    await scrape();
    console.log('Generando distribuciones de datos');
    await getData();
    console.log('Generando LRU de eventos');
    await LRU();
    console.log('Generando random de eventos');
    await Random();
  } catch (error) {
    throw new Error(`Error en el proceso: ${error.message}`);
  }
}
main();