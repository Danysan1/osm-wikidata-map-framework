import Dexie, { Table } from "dexie";
import type { EtymologyDetails } from "../model/EtymologyDetails";
import { getConfig } from "../config";

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

        setTimeout(async () => {
            this.transaction('rw', this.details, async () => {
                const maxHours = parseInt(getConfig("cache_timeout_hours") || "24"),
                    threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                    count = await this.details.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                if (process.env.NODE_ENV === 'development') console.debug("Evicted old maps from indexedDB", { count, maxHours, threshold });
            });
        }, 10_000);
    }

    public async getDetails(wikidataIDs: Set<string>, language?: string): Promise<Record<string, EtymologyDetails> | undefined> {
        try {
            const row = await this.transaction('r', this.details, async () => {
                return await this.details
                    .where({ language })
                    .and(row => {
                        if (wikidataIDs.size > row.wikidataIDs.size)
                            return false;

                        for (const id of wikidataIDs) {
                            if (!row.wikidataIDs.has(id))
                                return false;
                        }
                        return true;
                    })
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