import puppeteer from "puppeteer";
import Database from "better-sqlite3";

(async () => {
  const db = new Database('eventos.db');
  db.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id TEXT PRIMARY KEY,
      collection TEXT,
      type TEXT,
      city TEXT,
      street TEXT,
      severity INTEGER,
      reportBy TEXT,
      confidence INTEGER
    )
  `).run();

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO eventos
      (id, collection, type, city, street, severity, reportBy, confidence)
    VALUES
      (@id, @collection, @type, @city, @street, @severity, @reportBy, @confidence)
  `);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let totalEvents = 0;
  const TARGET = 10000;
  const INTERVAL_MS = 1000; 

  page.on('request', async request => {
    if (request.url().includes('georss')) {
      try {
        const res = await fetch(request.url());
        const data = await res.json();

        const alertas = data.alerts.map(alert => ({
          id: alert.id,
          collection: 'alertas',
          type: alert.type,
          city: alert.city,
          street: alert.street,
          severity: alert.severity,
          reportBy: null,
          confidence: null
        }));

        const jams = data.jams.map(jam => ({
          id: jam.id,
          collection: 'atascos',
          type: jam.type,
          city: null,
          street: jam.street,
          severity: null,
          reportBy: jam.reportBy,
          confidence: jam.confidence
        }));

        for (const e of [...alertas, ...jams]) {
          const info = {
            id: e.id,
            collection: e.collection,
            type: e.type,
            city: e.city || '',
            street: e.street,
            severity: e.severity || '',
            reportBy: e.reportBy || '',
            confidence: e.confidence
          };
          const result = insertEvent.run(info);
          if (result.changes > 0) totalEvents++;
        }

        console.log(`Eventos insertados: ${totalEvents} / ${TARGET}`);
      } catch (err) {
        console.error('Error:', err);
      }
    }
  });

  await page.goto('https://www.waze.com/es-419/live-map/', { waitUntil: 'networkidle2' });

  while (totalEvents < TARGET) {
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(res => setTimeout(res, INTERVAL_MS));
  }

  console.log('10000 eventos creados');
  await browser.close();
})();
