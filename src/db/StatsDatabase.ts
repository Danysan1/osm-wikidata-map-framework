import Dexie, { Table } from 'dexie';
import type { EtymologyStat } from '../controls/EtymologyColorControl';
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
    private maxHours: number;
    public stats!: Table<StatsRow, number>;

    public constructor(maxHours: number) {
        super("StatsDatabase");
        this.maxHours = maxHours;
        this.version(1).stores({
            stats: "++id, [colorSchemeID+language+wikidataIDs]"
        });

        setTimeout(() => {
            void this.transaction('rw', this.stats, async () => {
                const threshold = new Date(Date.now() - 1000 * 60 * 60 * this.maxHours),
                    count = await this.stats.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                if (process.env.NODE_ENV === 'development') console.debug("Evicted old maps from indexedDB", { count, threshold });
            });
        }, 10_000);
    }

    public async getStats(colorSchemeID: ColorSchemeID, wikidataIDs: string[], language?: string): Promise<EtymologyStat[] | undefined> {
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

