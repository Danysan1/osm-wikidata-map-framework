import Dexie, { Table } from "dexie";
import type { EtymologyDetails } from "../model/EtymologyDetails";

interface DetailsRow {
    id?: number;
    language?: string;
    wikidataIDs: Set<string>;
    details: Record<string, EtymologyDetails>;
    timestamp: string;
}

export class DetailsDatabase extends Dexie {
    public details!: Table<DetailsRow, number>;

    public constructor(maxHours?: number) {
        super("DetailsDatabase");
        this.version(1).stores({
            details: "++id, language"
        });

        if (maxHours) {
            setTimeout(() => {
                void this.transaction('rw', this.details, async () => {
                    const threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                        count = await this.details.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                    if (process.env.NODE_ENV === 'development') console.debug("Evicted old maps from indexedDB", { count, threshold });
                });
            }, 10_000);
        }
    }

    public async getDetails(wikidataIDs: Set<string>, language?: string): Promise<Record<string, EtymologyDetails> | undefined> {
        try {
            const row = await this.transaction('r', this.details, async () => {
                return await this.details
                    .where({ language })
                    .and(row => wikidataIDs.symmetricDifference(row.wikidataIDs).size === 0)
                    .first();
            });
            return row?.details;
        } catch (e) {
            console.error("Failed getting details from cache", e);
            return undefined;
        }
    }

    public async addDetails(details: Record<string, EtymologyDetails>, wikidataIDs: Set<string>, language?: string) {
        try {
            await this.transaction('rw', this.details, async () => {
                await this.details.add({ details, wikidataIDs, language, timestamp: new Date().toISOString() });
            });
        } catch (e) {
            console.error("Failed adding details to cache", e);
        }
    }
}