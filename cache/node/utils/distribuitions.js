import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';

const DB_PATH = '/db/eventos.db';

async function connectToDatabase() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.verbose().Database
    });
    console.log('Successfully connected to SQLite database');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function fetchAllWazeData(db) {
  try {
    const results = await db.all(`SELECT * FROM eventos`);
    console.log(`Retrieved ${results.length} total waze events`);
    return results;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

async function fetchLongTailDistributionData(db) {
  try {
    const streetCounts = await db.all(`
      SELECT street, COUNT(*) as count 
      FROM eventos 
      WHERE street IS NOT NULL 
      GROUP BY street 
      ORDER BY count DESC
    `);
    
    console.log(`Found ${streetCounts.length} unique streets`);
    
    const totalEvents = streetCounts.reduce((sum, item) => sum + item.count, 0);
    const eightyPercentThreshold = totalEvents * 0.8;
    
    let cumulativeCount = 0;
    const headStreets = [];
    
    for (const street of streetCounts) {
      headStreets.push(street.street);
      cumulativeCount += street.count;
      
      if (cumulativeCount >= eightyPercentThreshold) {
        break;
      }
    }
    
    console.log(`Long-tail head: ${headStreets.length} streets (${(headStreets.length / streetCounts.length * 100).toFixed(2)}%) make up 80% of events`);
    
    const placeholders = headStreets.map(() => '?').join(',');
    const headRecords = await db.all(`
      SELECT * FROM eventos 
      WHERE street IN (${placeholders})
    `, headStreets);
    
    return {
      distributionType: 'long-tail',
      stats: {
        totalUniqueStreets: streetCounts.length,
        streetsInHead: headStreets.length,
        percentOfStreetsInHead: (headStreets.length / streetCounts.length * 100).toFixed(2),
        totalRecords: totalEvents,
        recordsInHead: headRecords.length,
        percentOfRecordsInHead: (headRecords.length / totalEvents * 100).toFixed(2)
      },
      streets: headStreets,
      records: headRecords
    };
  } catch (error) {
    console.error('Error fetching long-tail data:', error);
    throw error;
  }
}

async function fetchEvenDistributionData(db) {
  try {
    const streetCounts = await db.all(`
      SELECT street, COUNT(*) as count 
      FROM eventos 
      WHERE street IS NOT NULL 
      GROUP BY street
    `);
    
    const mean = streetCounts.reduce((sum, item) => sum + item.count, 0) / streetCounts.length;
    
    streetCounts.forEach(street => {
      street.deviation = Math.abs(street.count - mean);
      street.deviationPercent = (street.deviation / mean) * 100;
    });
    
    streetCounts.sort((a, b) => a.deviation - b.deviation);
    
    const evenDistributionSize = Math.ceil(streetCounts.length * 0.2);
    const evenStreets = streetCounts.slice(0, evenDistributionSize).map(street => street.street);
    
    console.log(`Even distribution: Selected ${evenStreets.length} streets with counts closest to the mean (${mean.toFixed(2)})`);
    
    const placeholders = evenStreets.map(() => '?').join(',');
    const evenRecords = await db.all(`
      SELECT * FROM eventos 
      WHERE street IN (${placeholders})
    `, evenStreets);
    
    return {
      distributionType: 'even',
      stats: {
        totalUniqueStreets: streetCounts.length,
        streetsSelected: evenStreets.length,
        meanEventsPerStreet: mean.toFixed(2),
        totalRecords: streetCounts.reduce((sum, item) => sum + item.count, 0),
        recordsInSelection: evenRecords.length
      },
      streets: evenStreets,
      records: evenRecords
    };
  } catch (error) {
    console.error('Error fetching even distribution data:', error);
    throw error;
  }
}

async function retrieveDataForCacheTesting() {
  let db;
  try {
    db = await connectToDatabase();
    
    console.log('Retrieving long-tail distribution data...');
    const longTailData = await fetchLongTailDistributionData(db);
    
    console.log('Retrieving even distribution data...');
    const evenData = await fetchEvenDistributionData(db);
    
    const report = {
      longTailDistribution: {
        stats: longTailData.stats,
        recordCount: longTailData.records.length,
        streetCount: longTailData.streets.length
      },
      evenDistribution: {
        stats: evenData.stats,
        recordCount: evenData.records.length,
        streetCount: evenData.streets.length
      },
      generatedAt: new Date().toISOString()
    };
    
    const timestamp = Date.now();
    
    fs.writeFileSync(`waze_longtail_data.json`, JSON.stringify({
      metadata: report.longTailDistribution,
      records: longTailData.records
    }, null, 2));
    
    fs.writeFileSync(`waze_even_data.json`, JSON.stringify({
      metadata: report.evenDistribution,
      records: evenData.records
    }, null, 2));
    
    fs.writeFileSync(`waze_cache_test_summary.json`, JSON.stringify(report, null, 2));
    
    console.log(`Retrieved ${longTailData.records.length} records for long-tail distribution`);
    console.log(`Retrieved ${evenData.records.length} records for even distribution`);
    console.log(`Data files and summary saved`);
    
    await db.close();
    return report;
  } catch (error) {
    console.error('Data retrieval failed:', error);
    if (db) await db.close();
    return { success: false, error: error.message };
  }
}

async function fetchRecordsByIds(ids) {
  let db;
  try {
    db = await connectToDatabase();
    
    const placeholders = ids.map(() => '?').join(',');
    const records = await db.all(`
      SELECT * FROM eventos 
      WHERE id IN (${placeholders})
    `, ids);
    
    await db.close();
    return records;
  } catch (error) {
    console.error('Error fetching records by IDs:', error);
    if (db) await db.close();
    throw error;
  }
}

async function simulateLongTailCacheTest() {
  let db;
  try {
    db = await connectToDatabase();
    
    const streetCounts = await db.all(`
      SELECT street, COUNT(*) as count 
      FROM eventos 
      WHERE street IS NOT NULL 
      GROUP BY street 
      ORDER BY count DESC
    `);
    
    const totalStreets = streetCounts.length;
    const headStreetsCount = Math.ceil(totalStreets * 0.2);
    const headStreets = streetCounts.slice(0, headStreetsCount).map(s => s.street);
    
    console.log(`Simulating cache with ${headStreets.length} high-frequency streets`);
    
    const sampleSize = 100;
    const placeholders = headStreets.map(() => '?').join(',');
    const sampleIds = await db.all(`
      SELECT id FROM eventos 
      WHERE street IN (${placeholders})
      ORDER BY RANDOM()
      LIMIT ${sampleSize}
    `, headStreets);
    
    const ids = sampleIds.map(item => item.id);
    
    await db.close();
    
    console.log(`Generated ${ids.length} sample IDs for cache testing`);
    
    fs.writeFileSync(`cache_test_ids_longtail_${Date.now()}.json`, JSON.stringify(ids));
    
    return ids;
  } catch (error) {
    console.error('Cache simulation failed:', error);
    if (db) await db.close();
    throw error;
  }
}

export {
  connectToDatabase,
  fetchAllWazeData,
  fetchLongTailDistributionData,
  fetchEvenDistributionData,
  retrieveDataForCacheTesting,
  fetchRecordsByIds,
  simulateLongTailCacheTest
};

