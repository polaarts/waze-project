import sqlite3 from 'sqlite3';
import fs from 'fs';

let DB_PATH = '../../../db/eventos.db'
let db = new sqlite3.Database(DB_PATH);

export async function retrieveDataForCacheTesting() {
  db.all('SELECT * FROM eventos ORDER by RANDOM() LIMIT 10000;', [], (err, rows) => {
    if (err) {
      throw err;
    }
    // console.log('estoy vivo');
    
    const queries = rows;

    console.log(queries.length);
    
    const pareto = queries.map((q, i) => ({
      query : q,
      weight: 1 / Math.pow(i + 1, 2.2)
    }));
  
    // Normalizar y asignar instancias
    const totalWeight = pareto.reduce((sum, x) => sum + x.weight, 0);
    pareto.forEach(x => {
      x.instances = Math.floor((x.weight / totalWeight) * 50000);
    });
  
    // Expandir a lista final
    const finalList = [];
    pareto.forEach(x => {
      for (let i = 0; i < x.instances; i++) {
        finalList.push(x.query);
      }
    });  

    fs.writeFileSync('../../../output/long_tail_distribution.json', JSON.stringify(finalList, null, 2));
    console.log('Archivo generado con éxito: output.json');

    
    const InstancesPerQuery = 128;

    const evenWeightedRows = rows.map((row) => {
      return {
        query: row,
        instances: InstancesPerQuery
      };
    });

  // Expand to a flat list
  const evenFinalList = [];
  evenWeightedRows.forEach(item => {
    for (let i = 0; i < item.instances; i++) {
      evenFinalList.push(item.query);
    }
  });

  // Save even distribution to a new file
  fs.writeFileSync('../../../output/even_distribution.json', JSON.stringify(evenFinalList, null, 2));
  console.log('Archivo generado con distribución uniforme: output_even.json');


  });

  db.close();
}
retrieveDataForCacheTesting();