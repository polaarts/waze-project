import puppeteer from "puppeteer";
import Database from "better-sqlite3";

export async function scrapeWazeEvents({
    DB_PATH = '/db/eventos.db',
    targetEvents = 10000,
    interval = 10,
    headless = true
} = {}) {
    const db = new Database(DB_PATH);
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
    let shouldStop = false;
    
    const browser = await puppeteer.launch({ 
        headless, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
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
                    if (totalEvents >= targetEvents) {
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

                console.log(`Insertados ${totalEvents}/${targetEvents}`);
            } catch (err) {
                console.error(err);
            }
        });

        await page.goto('https://www.waze.com/es-419/live-map/', { waitUntil: 'networkidle2' });

        while (totalEvents < targetEvents && !shouldStop) {
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, interval * 1000));
        }

        console.log(`${totalEvents} eventos creados`);
    } finally {
        await browser.close();
    }
    
    return totalEvents;
}
