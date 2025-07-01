import { Client } from '@elastic/elasticsearch';
import Database from 'better-sqlite3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const ES_HOST  = process.env.ELASTICSEARCH_HOST;
const ES_INDEX = process.env.ES_INDEX || 'waze-events';
const DB_PATH  = '/db/eventos.db';

async function ensureIndex(client) {
  const exists = await client.indices.exists({ index: ES_INDEX });
  if (!exists) {
    const mapping = JSON.parse(fs.readFileSync('./mappings.json', 'utf-8'));
    await client.indices.create({
      index: ES_INDEX,
      body: mapping
    });
    console.log(`Índice "${ES_INDEX}" creado con mapeo.`);
  } else {
    console.log(`Índice "${ES_INDEX}" ya existe.`);
  }
}

async function bulkIndex(client, docs) {
  const body = docs.flatMap(doc => [{ index: { _index: ES_INDEX, _id: doc.eventId } }, doc]);
  const { errors, items } = await client.bulk({ refresh: true, body });
  if (errors) {
    console.error('Algunos documentoss fallaron al indexar:', items.filter(i => i.index && i.index.error));
  } else {
    console.log(`Indexados ${docs.length} eventos en "${ES_INDEX}".`);
  }
}

async function main() {
  const client = new Client({ node: ES_HOST });
  console.log('Conectando a Elasticsearch en', ES_HOST);
  
  await ensureIndex(client);
  
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare("SELECT *, datetime('now') AS timestamp FROM eventos").all();
  db.close();
  
  if (rows.length === 0) {
    console.log('No hay eventos en la BD para indexar.');
    return;
  }
  
  await bulkIndex(client, rows);
  
  console.log('Proceso de indexación completado.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error en indexación:', err);
  process.exit(1);
});
