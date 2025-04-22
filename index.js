import puppeteer from "puppeteer";
import Database from "better-sqlite3";

(async () => {
  const db = new Database('eventos.db');
  db.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    INSERT INTO eventos
      (collection, type, city, street, severity, reportBy, confidence)
    VALUES
      (@collection, @type, @city, @street, @severity, @reportBy, @confidence)
  `);

  let totalEvents = 0;
  const TARGET = 10000;
  const INTERVALO = 10;
  let shouldStop = false;

  for (const browser of [await puppeteer.launch({ headless: true })]) {
    const page = await browser.newPage();

    page.on('request', async request => {
      if (!request.url().includes('georss')) return;
      try {
        const data = await (await fetch(request.url())).json();
        const items = [
          ...data.alerts.map(a => ({
            collection: 'alertas', type: a.type, city: a.city, street: a.street,
            severity: a.severity, reportBy: null, confidence: null
          })),
          ...data.jams.map(j => ({
            collection: 'atascos', type: j.type, city: null, street: j.street,
            severity: null, reportBy: j.reportBy, confidence: j.confidence
          }))
        ];

        for (const e of items) {
          if (totalEvents >= TARGET) {
            shouldStop = true;
            break;
          }
          insertEvent.run({
            collection: e.collection,
            type:       e.type,
            city:       e.city    || '',
            street:     e.street,
            severity:   e.severity || 0,
            reportBy:   e.reportBy || '',
            confidence: e.confidence || 0
          });
          totalEvents++;
        }

        console.log(`Insertados ${totalEvents}/${TARGET}`);
      } catch (err) {
        console.error(err);
      }
    });

    await page.goto('https://www.waze.com/es-419/live-map/', { waitUntil: 'networkidle2' });

    while (totalEvents < TARGET) {
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, INTERVALO));
    }

    console.log('10 000 eventos creados');
    await browser.close();
  }
})();
