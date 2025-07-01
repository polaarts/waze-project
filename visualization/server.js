import { Client } from '@elastic/elasticsearch';
import Database from 'better-sqlite3';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ES_HOST  = process.env.ELASTICSEARCH_HOST;
const ES_INDEX = process.env.ES_INDEX || 'waze-events';
const DB_PATH  = '/db/eventos.db';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureIndex(client) {
  const exists = await client.indices.exists({ index: ES_INDEX });
  if (!exists) {
    const mapping = JSON.parse(fs.readFileSync('./mapeo.json', 'utf-8'));
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
    console.error('Algunos documentos fallaron al indexar:', items.filter(i => i.index && i.index.error));
  } else {
    console.log(`Indexados ${docs.length} eventos en "${ES_INDEX}".`);
  }
}

app.get('/api/data/analysis-by-type', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('../pig/output/analysis_by_type.json', 'utf-8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading analysis_by_type.json:', error);
    res.status(500).json({ error: 'Error al cargar datos de análisis por tipo' });
  }
});

app.get('/api/data/analysis-by-city', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('../pig/output/analysis_by_city.json', 'utf-8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading analysis_by_city.json:', error);
    res.status(500).json({ error: 'Error al cargar datos de análisis por ciudad' });
  }
});

app.get('/api/data/consolidated-summary', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('../pig/output/consolidated_summary.json', 'utf-8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading consolidated_summary.json:', error);
    res.status(500).json({ error: 'Error al cargar resumen consolidado' });
  }
});

app.get('/api/elasticsearch/search', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    const response = await client.search({
      index: ES_INDEX,
      size: 100,
      body: {
        query: { match_all: {} }
      }
    });
    
    res.json(response.body.hits);
  } catch (error) {
    console.error('Error searching Elasticsearch:', error);
    res.status(500).json({ error: 'Error al buscar en Elasticsearch' });
  }
});

async function indexData() {
  if (!ES_HOST) {
    console.log('Elasticsearch no configurado, omitiendo indexación.');
    return;
  }
  
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
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`Servidor de visualización corriendo en http://localhost:${PORT}`);
  
  if (ES_HOST) {
    try {
      await indexData();
    } catch (error) {
      console.error('Error durante la indexación inicial:', error);
    }
  }
});
