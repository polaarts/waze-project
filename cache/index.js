import getData from "./utils/distributions.js";
import scrape from "./utils/scrape.js";
import { LRU, Random } from './utils/policies.js'

await scrape();
await getData()
await LRU()
await Random()