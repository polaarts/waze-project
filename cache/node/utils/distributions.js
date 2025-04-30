import sqlite3 from 'sqlite3';
import fs from 'fs';

let DB_PATH = '/db/eventos.db'
let db = new sqlite3.Database(DB_PATH);

export async function retrieveDataForCacheTesting() {
  db.all('SELECT * FROM eventos ORDER by RANDOM();', [], (err, rows) => {
    if (err) {
      throw err;
    }
    console.log('estoy vivo');
    
    const queries = rows;

    
    const alpha = 1.5; 
    const paretoWeights = queries.map((q, index) => ({
      query: q,
      weight: 1 / Math.pow(index + 1, alpha)
    }));

    const totalWeight = paretoWeights.reduce((sum, q) => sum + q.weight, 0);
    paretoWeights.forEach(q => {
      q.instances = Math.floor((q.weight / totalWeight) * 10000); // Escala a 10,000 instancias
    });

    let finalList = [];
    paretoWeights.forEach(q => {
      for (let i = 0; i < q.instances; i++) {
        finalList.push(q.query);
      }
    });  

    fs.writeFileSync('/output/long_tail_distribution.json', JSON.stringify(finalList, null, 2));
    console.log('Archivo generado con éxito: output.json');

    
    const InstancesPerQuery = Math.floor(10000 / 500);

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
  fs.writeFileSync('/output/even_distribution.json', JSON.stringify(evenFinalList, null, 2));
  console.log('Archivo generado con distribución uniforme: output_even.json');


  });

  db.close();
}