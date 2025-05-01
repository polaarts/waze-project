import puppeteer from "puppeteer";
import Database from "better-sqlite3";

/**
 * 
 * @param {Object} options
 * @param {string} options.DB_PATH
 * @param {number} options.targetEvents 
 * @param {number} options.interval 
 * @param {boolean} options.headless 
 * @returns {Promise<number>}
 */
export default async function scrape({
    DB_PATH = '/db/eventos.db',
    targetEvents = 10000,
    interval = 10,
    headless = true
} = {}) {
    const db = new Database(DB_PATH);
    
    db.prepare(`
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection TEXT,      -- Tipo de colección (alertas o atascos)
            type TEXT,            -- Tipo específico de evento
            city TEXT,            -- Ciudad donde ocurre el evento
            street TEXT,          -- Calle donde ocurre el evento
            severity INTEGER,     -- Nivel de gravedad (para alertas)
            reportBy TEXT,        -- Quién reportó el evento (para atascos)
            confidence INTEGER,   -- Nivel de confianza del reporte (para atascos)
            eventId TEXT,         -- Identificador único del evento
            UNIQUE(eventId)       -- Garantiza que no haya duplicados
        )
    `).run();

    const insertEvent = db.prepare(`
        INSERT OR IGNORE INTO eventos
            (collection, type, city, street, severity, reportBy, confidence, eventId)
        VALUES
            (@collection, @type, @city, @street, @severity, @reportBy, @confidence, @eventId)
    `);

    const countEvents = db.prepare('SELECT COUNT(*) as count FROM eventos').get();
    let totalEvents = countEvents.count;
    let shouldStop = false;
    
    console.log('Se ha iniciado la recolección de eventos de Waze');
    
    const browser = await puppeteer.launch({ 
        headless, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        // Set para rastrear IDs ya procesados y evitar duplicados
        const processedIds = new Set();

        page.on('request', async request => {
            if (!request.url().includes('georss')) return;
            try {
                const data = await (await fetch(request.url())).json();
                const items = [
                    ...data.alerts.map(a => ({
                        collection: 'alertas', 
                        type: a.type, 
                        city: a.city, 
                        street: a.street,
                        severity: a.severity, 
                        reportBy: null, 
                        confidence: null,
                        eventId: `alert_${a.id || a.uuid || `${a.type}_${a.street}_${a.city}`}`
                    })),
                    ...data.jams.map(j => ({
                        collection: 'atascos', 
                        type: j.type, 
                        city: null, 
                        street: j.street,
                        severity: null, 
                        reportBy: j.reportBy, 
                        confidence: j.confidence,
                        eventId: `jam_${j.id || j.uuid || `${j.type}_${j.street}_${j.reportBy}`}`
                    }))
                ];

                const transaction = db.transaction(() => {
                    let inserted = 0;
                    for (const e of items) {
                        if (totalEvents >= targetEvents) {
                            shouldStop = true;
                            break;
                        }
                        
                        if (processedIds.has(e.eventId)) continue;
                        processedIds.add(e.eventId);
                        
                        const result = insertEvent.run({
                            collection: e.collection,
                            type:       e.type,
                            city:       e.city    || '',
                            street:     e.street,
                            severity:   e.severity || 0,
                            reportBy:   e.reportBy || '',
                            confidence: e.confidence || 0,
                            eventId:    e.eventId
                        });
                        
                        if (result.changes > 0) {
                            totalEvents++;
                            inserted++;
                        }
                    }
                    return inserted;
                });
                
                const inserted = transaction();
                if (inserted > 0) {
                    console.log(`Insertados ${inserted} nuevos eventos. Total: ${totalEvents}/${targetEvents}`);
                }
            } catch (err) {
                console.error(err);
            }
        });

        await page.goto('https://www.waze.com/es-419/live-map/', { waitUntil: 'networkidle2' });

        // Refresca la página periódicamente para obtener nuevos eventos
        while (totalEvents < targetEvents && !shouldStop) {
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, interval * 1000));
        }

        console.log(`${totalEvents} eventos únicos creados en total`);
    } finally {
        await browser.close();
    }
    
    return totalEvents;
}
