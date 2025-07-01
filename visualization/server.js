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
const ES_CACHE_INDEX = process.env.ES_CACHE_INDEX || 'waze-cache-metrics';
const ES_PIG_INDEX = process.env.ES_PIG_INDEX || 'waze-pig-metrics';
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
    const errorItems = items.filter(i => i.index && i.index.error);
    console.error(`❌ ${errorItems.length} documentos fallaron al indexar:`);
    errorItems.forEach(({ index: { _id, error } }) => {
      console.error(`  • Doc ID=${_id}: [${error.type}] ${error.reason}`);
    });
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
  const rows = db.prepare(
    "SELECT *, strftime('%Y-%m-%dT%H:%M:%SZ','now') AS timestamp FROM eventos"
  ).all();
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

app.get('/cache', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cache-dashboard.html'));
});

app.get('/pig', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pig-dashboard.html'));
});

app.get('/api/cache/aggregated-stats', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_CACHE_INDEX,
      size: 0,
      body: {
        aggs: {
          by_combination: {
            terms: {
              field: "policy",
              size: 10
            },
            aggs: {
              by_distribution: {
                terms: {
                  field: "distribution",
                  size: 10
                },
                aggs: {
                  avg_hit_rate: {
                    avg: {
                      field: "hit_rate"
                    }
                  },
                  total_operations: {
                    max: {
                      field: "total_operations"
                    }
                  },
                  total_hits: {
                    max: {
                      field: "total_hits"
                    }
                  },
                  total_misses: {
                    max: {
                      field: "total_misses"
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    const combinations = [];
    const aggregations = response.body?.aggregations || response.aggregations;
    
    if (aggregations && aggregations.by_combination) {
      aggregations.by_combination.buckets.forEach(policyBucket => {
        policyBucket.by_distribution.buckets.forEach(distBucket => {
          combinations.push({
            policy: policyBucket.key,
            distribution: distBucket.key,
            avgHitRate: distBucket.avg_hit_rate.value || 0,
            totalOperations: distBucket.total_operations.value || 0,
            totalHits: distBucket.total_hits.value || 0,
            totalMisses: distBucket.total_misses.value || 0
          });
        });
      });
    }
    
    res.json({ combinations });
    
  } catch (error) {
    console.error('Error fetching cache aggregated stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas agregadas de caché' });
  }
});

app.get('/api/events-by-type', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: { aggs: { by_type: { terms: { field: 'type.keyword', size: 10 } } } }
  });
  const buckets = resp.body.aggregations.by_type.buckets;
  res.json({
    labels: buckets.map(b => b.key),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/events-by-location', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: { aggs: { by_loc: { terms: { field: 'city.keyword', size: 10 } } } }
  });
  const buckets = resp.body.aggregations.by_loc.buckets;
  res.json({
    labels: buckets.map(b => b.key),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/events-timeline', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: {
      aggs: {
        timeline: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: 'hour'
          }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.timeline.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/events-by-type', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: { aggs: { by_type: { terms: { field: 'type.keyword', size: 10 } } } }
  });
  const buckets = resp.body.aggregations.by_type.buckets;
  res.json({
    labels: buckets.map(b => b.key),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/events-by-location', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: { aggs: { by_loc: { terms: { field: 'city.keyword', size: 10 } } } }
  });
  const buckets = resp.body.aggregations.by_loc.buckets;
  res.json({
    labels: buckets.map(b => b.key),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/events-timeline', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_INDEX,
    size: 0,
    body: {
      aggs: {
        timeline: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: 'hour'
          }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.timeline.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/cache/metrics', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_CACHE_INDEX,
    size: 0,
    body: {
      aggs: {
        hit_rate: { avg: { field: 'hit_rate' } },
        memory_usage: { max: { field: 'memory_usage' } },
        operations_per_sec: { avg: { field: 'operations_per_sec' } },
        total_keys: { max: { field: 'total_keys' } }
      }
    }
  });
  const a = resp.body.aggregations;
  res.json({
    hit_rate: a.hit_rate.value,
    memory_usage: a.memory_usage.value,
    operations_per_sec: a.operations_per_sec.value,
    total_keys: a.total_keys.value
  });
});

app.get('/api/cache/hit-rate-history', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_CACHE_INDEX,
    size: 0,
    body: {
      aggs: {
        over_time: {
          date_histogram: { field: 'timestamp', fixed_interval: '10m' },
          aggs: { avg_hit_rate: { avg: { field: 'hit_rate' } } }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.over_time.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.avg_hit_rate.value || 0) }]
  });
});

app.get('/api/cache/memory-usage', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_CACHE_INDEX,
    size: 0,
    body: {
      aggs: {
        over_time: {
          date_histogram: { field: 'timestamp', fixed_interval: '10m' },
          aggs: { max_mem: { max: { field: 'memory_usage' } } }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.over_time.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.max_mem.value || 0) }]
  });
});

app.get('/api/cache/operations', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_CACHE_INDEX,
    size: 0,
    body: {
      aggs: {
        over_time: {
          date_histogram: { field: 'timestamp', fixed_interval: '10m' },
          aggs: { avg_ops: { avg: { field: 'operations_per_sec' } } }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.over_time.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.avg_ops.value || 0) }]
  });
});

app.get('/api/pig/status', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_PIG_INDEX,
    size: 1,
    body: { query: { term: { phase: 'summary' } } }
  });
  const hit = resp.body.hits.hits[0]?._source;
  res.json(hit || {});
});

app.get('/api/pig/incidents-by-type', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_PIG_INDEX,
    size: 0,
    body: {
      aggs: { by_type: { terms: { field: 'type.keyword', size: 10 } } }
    }
  });
  const b = resp.body.aggregations.by_type.buckets;
  res.json({
    labels: b.map(x => x.key),
    datasets: [{ data: b.map(x => x.doc_count) }]
  });
});

app.get('/api/pig/incidents-by-city', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_PIG_INDEX,
    size: 0,
    body: {
      aggs: { by_city: { terms: { field: 'city.keyword', size: 10 } } }
    }
  });
  const b = resp.body.aggregations.by_city.buckets;
  res.json({
    labels: b.map(x => x.key),
    datasets: [{ data: b.map(x => x.doc_count) }]
  });
});

app.get('/api/pig/filtering-timeline', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  const resp = await client.search({
    index: ES_PIG_INDEX,
    size: 0,
    body: {
      query: { term: { phase: 'filtering' } },
      aggs: {
        over_time: {
          date_histogram: { field: 'timestamp', fixed_interval: '1m' }
        }
      }
    }
  });
  const buckets = resp.body.aggregations.over_time.buckets;
  res.json({
    labels: buckets.map(b => b.key_as_string),
    datasets: [{ data: buckets.map(b => b.doc_count) }]
  });
});

app.get('/api/metrics', async (req, res) => {
  const client = new Client({ node: ES_HOST });
  try {
    const total = (await client.count({ index: ES_INDEX })).count;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = (await client.count({
      index: ES_INDEX,
      body: { query: { range: { timestamp: { gte: todayStart.toISOString() } } } }
    })).count;
    const alerts = (await client.count({
      index: ES_INDEX,
      body: { query: { term: { type: 'alert' } } }
    })).count;
    const jams = (await client.count({
      index: ES_INDEX,
      body: { query: { term: { type: 'jam' } } }
    })).count;

    res.json({ total, today, alerts, jams });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al calcular métricas' });
  }
});

app.get('/api/cache/timeseries', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_CACHE_INDEX,
      size: 0,
      body: {
        aggs: {
          by_policy_dist: {
            terms: {
              field: "policy",
              size: 10
            },
            aggs: {
              by_distribution: {
                terms: {
                  field: "distribution",
                  size: 10
                },
                aggs: {
                  over_time: {
                    date_histogram: {
                      field: "timestamp",
                      fixed_interval: "10m"
                    },
                    aggs: {
                      avg_hit_rate: {
                        avg: {
                          field: "hit_rate"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    const timeSeries = {};
    const aggregations = response.body?.aggregations || response.aggregations;
    
    if (aggregations && aggregations.by_policy_dist) {
      aggregations.by_policy_dist.buckets.forEach(policyBucket => {
        policyBucket.by_distribution.buckets.forEach(distBucket => {
          const key = `${policyBucket.key}-${distBucket.key}`;
          timeSeries[key] = distBucket.over_time.buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
            avgHitRate: bucket.avg_hit_rate.value || 0
          }));
        });
      });
    }
    
    res.json(timeSeries);
    
  } catch (error) {
    console.error('Error fetching cache timeseries:', error);
    res.status(500).json({ error: 'Error al obtener serie temporal de caché' });
  }
});

app.get('/api/cache/raw-search', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    const { policy, distribution, limit = 1000 } = req.query;
    
    const query = {
      bool: {
        must: []
      }
    };
    
    if (policy) {
      query.bool.must.push({ term: { policy: policy } });
    }
    
    if (distribution) {
      query.bool.must.push({ term: { distribution: distribution } });
    }
    
    const response = await client.search({
      index: ES_CACHE_INDEX,
      size: limit,
      sort: [{ timestamp: { order: 'asc' } }],
      body: {
        query: query.bool.must.length > 0 ? query : { match_all: {} }
      }
    });
    
    res.json(response.body?.hits || response.hits);
    
  } catch (error) {
    console.error('Error searching cache data:', error);
    res.status(500).json({ error: 'Error al buscar datos de caché' });
  }
});

app.get('/api/pig/analysis-by-type', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: 100,
      body: {
        query: {
          bool: {
            must: [
              { term: { phase: 'analysis' } },
              { exists: { field: 'frequency' } }
            ]
          }
        },
        sort: [{ frequency: { order: 'desc' } }]
      }
    });
    
    const hits = response.body?.hits?.hits || response.hits?.hits || [];
    const data = hits.map(hit => hit._source);
    
    res.json({ data });
    
  } catch (error) {
    console.error('Error fetching pig analysis by type:', error);
    res.status(500).json({ error: 'Error al obtener análisis por tipo de Pig' });
  }
});

app.get('/api/pig/analysis-by-city', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: 100,
      body: {
        query: {
          bool: {
            must: [
              { term: { phase: 'analysis' } },
              { exists: { field: 'incidents' } }
            ]
          }
        },
        sort: [{ incidents: { order: 'desc' } }]
      }
    });
    
    const hits = response.body?.hits?.hits || response.hits?.hits || [];
    const data = hits.map(hit => hit._source);
    
    res.json({ data });
    
  } catch (error) {
    console.error('Error fetching pig analysis by city:', error);
    res.status(500).json({ error: 'Error al obtener análisis por ciudad de Pig' });
  }
});

app.get('/api/pig/summary', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: 1,
      body: {
        query: {
          term: { phase: 'summary' }
        }
      }
    });
    
    const hits = response.body?.hits?.hits || response.hits?.hits || [];
    const data = hits.length > 0 ? hits[0]._source : null;
    
    res.json({ data });
    
  } catch (error) {
    console.error('Error fetching pig summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen de Pig' });
  }
});

app.get('/api/pig/filtering-timeseries', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: 0,
      body: {
        query: {
          term: { phase: 'filtering' }
        },
        aggs: {
          operations_over_time: {
            date_histogram: {
              field: 'timestamp',
              fixed_interval: '1m'
            }
          }
        }
      }
    });
    
    const aggregations = response.body?.aggregations || response.aggregations;
    const buckets = aggregations?.operations_over_time?.buckets || [];
    
    const data = buckets.map(bucket => ({
      timestamp: bucket.key_as_string,
      count: bucket.doc_count
    }));
    
    res.json({ data });
    
  } catch (error) {
    console.error('Error fetching pig filtering timeseries:', error);
    res.status(500).json({ error: 'Error al obtener serie temporal de filtrado de Pig' });
  }
});

app.get('/api/pig/top-streets', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    const limit = parseInt(req.query.limit) || 10;
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              { term: { phase: 'filtering' } },
              { exists: { field: 'street' } }
            ]
          }
        },
        aggs: {
          top_streets: {
            terms: {
              field: 'street.keyword',
              size: limit,
              order: { _count: 'desc' }
            },
            aggs: {
              cities: {
                terms: {
                  field: 'city',
                  size: 5
                }
              }
            }
          }
        }
      }
    });
    
    const aggregations = response.body?.aggregations || response.aggregations;
    const buckets = aggregations?.top_streets?.buckets || [];
    
    const data = buckets.map(bucket => ({
      street: bucket.key,
      count: bucket.doc_count,
      cities: bucket.cities.buckets.map(cityBucket => ({
        city: cityBucket.key,
        count: cityBucket.doc_count
      }))
    }));
    
    res.json({ data });
    
  } catch (error) {
    console.error('Error fetching pig top streets:', error);
    res.status(500).json({ error: 'Error al obtener top calles de Pig' });
  }
});

app.get('/api/pig/raw-search', async (req, res) => {
  try {
    if (!ES_HOST) {
      return res.status(500).json({ error: 'Elasticsearch no configurado' });
    }
    
    const client = new Client({ node: ES_HOST });
    const { phase, type, city, limit = 100 } = req.query;
    
    const query = {
      bool: {
        must: []
      }
    };
    
    if (phase) {
      query.bool.must.push({ term: { phase: phase } });
    }
    
    if (type) {
      query.bool.must.push({ term: { type: type } });
    }
    
    if (city) {
      query.bool.must.push({ term: { city: city } });
    }
    
    const response = await client.search({
      index: ES_PIG_INDEX,
      size: limit,
      sort: [{ timestamp: { order: 'desc' } }],
      body: {
        query: query.bool.must.length > 0 ? query : { match_all: {} }
      }
    });
    
    res.json(response.body?.hits || response.hits);
    
  } catch (error) {
    console.error('Error searching pig data:', error);
    res.status(500).json({ error: 'Error al buscar datos de Pig' });
  }
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
