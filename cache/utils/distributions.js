import sqlite3 from 'sqlite3';
import fs from 'fs/promises'; 

let DB_PATH = '/db/eventos.db'
let db = new sqlite3.Database(DB_PATH);

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
      
        const totalWeight = pareto.reduce((sum, x) => sum + x.weight, 0);
        pareto.forEach(x => {
          x.instances = Math.floor((x.weight / totalWeight) * 50000);
        });
      
        const finalList = [];
        pareto.forEach(x => {
          for (let i = 0; i < x.instances; i++) {
            finalList.push(x.query);
          }
        });  

        await fs.writeFile('/cache/data/long_tail_distribution.json', JSON.stringify(finalList, null, 2));
        console.log('Archivo generado con éxito: long_tail_distribution.json');

        
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