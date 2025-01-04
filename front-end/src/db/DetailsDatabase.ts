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

    public constructor() {
        super("DetailsDatabase");
        this.version(1).stores({
            details: "++id, language"
        });
    }

    public async clearDetails(maxHours?: number) {
        await this.transaction('rw', this.details, async () => {
            if (maxHours) {
                const threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                    count = await this.details.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                console.debug("Evicted old details from indexedDB", { maxHours, count, threshold });
            } else {
                await this.details.clear();
                console.debug("Cleared all details from indexedDB");
            }
        });
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