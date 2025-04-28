import { retrieveDataForCacheTesting } from "./utils/distribuitions";
import { scrapeWazeEvents } from "./utils/scrape";
import { cache } from "./utils/cache";

await scrapeWazeEvents({ DB_PATH: '/db/eventos.db', targetEvents: 10000 });

await retrieveDataForCacheTesting().then(report => {
  console.log('Cache test data retrieved successfully');
}).catch(err => {
  console.error('Failed to retrieve cache test data:', err);
});

await cache();