import sqlite3 from 'sqlite3';
import fs from 'fs/promises';

const DB_PATH = '/db/eventos.db' 
const db = new sqlite3.Database(DB_PATH);

/**
 * Genera archivos JSON con diferentes distribuciones de datos
 * - long_tail_distribution.json: Distribución de cola larga (distribución Pareto)
 * - even_distribution.json: Distribución uniforme
 * 
 * @returns {Promise<void>}
 */
export default function getData() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM eventos ORDER by RANDOM() LIMIT 10000;', [], async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const queries = rows;
        console.log(queries.length); 
       
        const pareto = queries.map((q, i) => ({
          query : q,
          weight: 1 / Math.pow(i + 1, 2.2)
        }));
      
        // Calcula el peso total para normalizar
        const totalWeight = pareto.reduce((sum, x) => sum + x.weight, 0);
        
        // Calcula la cantidad de instancias para cada consulta basado en su peso relativo
        pareto.forEach(x => {
          x.instances = Math.floor((x.weight / totalWeight) * 50000);
        });
      
        // Genera la lista final con duplicados según el peso (distribución Pareto)
        const finalList = [];
        pareto.forEach(x => {
          for (let i = 0; i < x.instances; i++) {
            finalList.push(x.query);  // Añade múltiples instancias según el peso
          }
        });  

        // Guarda la distribución de cola larga en formato JSON
        await fs.writeFile('/cache/data/long_tail_distribution.json', JSON.stringify(finalList, null, 2));
        console.log('Archivo generado con éxito: long_tail_distribution.json');
        
        // Generación de distribución uniforme (mismo número de instancias para cada consulta)
        const InstancesPerQuery = 128;
        const evenWeightedRows = rows.map((row) => {
          return {
            query: row,
            instances: InstancesPerQuery
          };
        });

        const evenFinalList = [];
        evenWeightedRows.forEach(item => {
          for (let i = 0; i < item.instances; i++) {
            evenFinalList.push(item.query);
          }
        });

        
        await fs.writeFile('/cache/data/even_distribution.json', JSON.stringify(evenFinalList, null, 2));
        console.log('Archivo generado con distribución uniforme: even_distribution.json');
        
        db.close();
        resolve();
      } catch (error) {
        db.close();
        reject(error);
      }
    });
  });
}