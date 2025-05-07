import Dexie, { Table } from 'dexie';
import type { EtymologyStat } from '../model/EtymologyStat';
import type { ColorSchemeID } from '../model/colorScheme';

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
        this.version(3).stores({
            stats: "++id, [colorSchemeID+language+wikidataIDs]",
        });
    }

    public async clear(maxHours?: number) {
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : null;
        await this.transaction('rw', this.stats, async () => {
            const count = await this.stats.filter(row => !row.timestamp || !threshold || new Date(row.timestamp) < threshold).delete();
            console.debug("Evicted old stats from indexedDB", { count, threshold });
        });
    }

    public async getStats(colorSchemeID: ColorSchemeID, wikidataIDs: string[], language?: string): Promise<EtymologyStat[] | undefined> {
        try {
            const row = await this.transaction('r', this.stats, async () => {
                return await this.stats.where({ colorSchemeID, language, wikidataIDs }).first();
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

