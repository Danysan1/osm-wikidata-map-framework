import Dexie, { Table } from 'dexie';
import { debugLog } from '../config';
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
    }

    public async getStats(colorSchemeID: ColorSchemeID, wikidataIDs: string[], language?: string, maxHours?: number): Promise<EtymologyStat[] | undefined> {
        try {
            const row = await this.transaction('r', this.stats, async () => {
                return await this.stats
                    .where({ colorSchemeID, language, wikidataIDs })
                    .first();
            });

            const outdated = maxHours && row?.timestamp && new Date(row.timestamp) < new Date(Date.now() - 1000 * 60 * maxHours);
            if (outdated && row.id) {
                debugLog("Evicting old stats from cache", row);
                await this.transaction('r', this.stats, async () => {
                    if (row.id) await this.stats.delete(row.id);
                });
                return undefined;
            }

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

