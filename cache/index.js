import getData from "./utils/distributions.js";
import scrape from "./utils/scrape.js";
import { LRU, Random } from './utils/policies.js'

// await scrapeWazeEvents({ DB_PATH: '/db/eventos.db', targetEvents: 10000 });

await console.log('Iniciando la recolección de eventos de Waze');
await getData()

await console.log('Generando LRU de eventos');
await LRU()

await console.log('Generando random de eventos');
await Random()