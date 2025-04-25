import Dexie, { Table } from "dexie";
import type { LinkedEntityDetails } from "../model/LinkedEntityDetails";

interface EntityDetailsRow {
    id?: number;
    language?: string;
    wikidataIDs: Set<string>;
    details: Record<string, LinkedEntityDetails>;
    timestamp: string;
}

export class EntityDetailsDatabase extends Dexie {
    public details!: Table<EntityDetailsRow, number>;

    public constructor() {
        super("EntityDetailsDatabase");
        this.version(3).stores({
            details: "++id, language",
        });
    }

    public async clear(maxHours?: number) {
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : new Date(0);
        await this.transaction('rw', this.details, async () => {
            const count = await this.details.filter(row => !row.timestamp || new Date(row.timestamp) < threshold).delete();
            console.debug("Evicted old details from indexedDB", { count, threshold });
        });
    }

    public async getDetails(wikidataIDs: Set<string>, language?: string): Promise<Record<string, LinkedEntityDetails> | undefined> {
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

    public async addDetails(details: Record<string, LinkedEntityDetails>, wikidataIDs: Set<string>, language?: string) {
        try {
            await this.transaction('rw', this.details, async () => {
                await this.details.add({ details, wikidataIDs, language, timestamp: new Date().toISOString() });
            });
        } catch (e) {
            console.error("Failed adding details to cache", e);
        }
    }
}

