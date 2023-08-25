import Dexie, { Table } from 'dexie';
import { debug, getConfig } from '../config';
import { EtymologyStat } from '../controls/EtymologyColorControl';
import { ColorSchemeID } from '../colorScheme.model';

interface StatsRow {
    id?: number;
    language?: string;
    colorSchemeID: ColorSchemeID;
    stats: EtymologyStat[];
    timestamp: string;
    wikidataIDs: string[];
}

export class StatsDatabase extends Dexie {
    public stats!: Table<StatsRow, number>;

    public constructor() {
        super("StatsDatabase");
        this.version(1).stores({
            stats: "++id, [colorSchemeID+language+wikidataIDs]"
        });

        setTimeout(async () => {
            const maxHours = parseInt(getConfig("cache_timeout_hours") || "24"),
                threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                count = await this.stats.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
            if (debug) console.info("Evicted old maps from indexedDB", { count, maxHours, threshold });
        }, 10_000);
    }

    public async getStats(colorSchemeID: ColorSchemeID, wikidataIDs: string[], language?: string, maxHours?: number): Promise<EtymologyStat[] | undefined> {
        try {
            const row = await this.transaction('r', this.stats, async () => {
                return await this.stats
                    .where({ colorSchemeID, language, wikidataIDs })
                    .first();
            });
            return row?.stats;
        } catch (e) {
            console.error("Failed getting stats from cache", e);
            return undefined;
        }
    }

    public async addStats(stats: EtymologyStat[], colorSchemeID: ColorSchemeID, wikidataIDs: string[], language?: string) {
        try {
            await this.transaction('rw', this.stats, async () => {
                await this.stats.add({ stats, colorSchemeID, wikidataIDs, language, timestamp: new Date().toISOString() });
            });
        } catch (e) {
            console.error("Failed adding stats to cache", e);
        }
    }
}

