import Dexie, { Table } from "dexie";
import type { EntityLinkNote } from "../model/LinkedEntity";

interface EntityLinkNotesRow {
    id?: number;
    featureQID: string;
    propertyPID: string;
    linkedEntityQIDs: Set<string>;
    language: string;
    notes?: Record<string, EntityLinkNote>;
    timestamp: string;
}

export class EntityLinkNotesDatabase extends Dexie {
    public entityLinkNotes!: Table<EntityLinkNotesRow, number>;

    public constructor() {
        super("EntityLinkNotesDatabase");
        this.version(3).stores({
            entityLinkNotes: "++id, [featureQID+propertyPID+language]",
        });
    }

    public async clear(maxHours?: number) {
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : null;
        await this.transaction('rw', this.entityLinkNotes, async () => {
            const count = await this.entityLinkNotes.filter(row => !row.timestamp || !threshold || new Date(row.timestamp) < threshold).delete();
            console.debug("Evicted old entityLinkNotes from indexedDB", { count, threshold });
        });
    }

    public async getEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQIDs: Set<string>, language: string): Promise<Record<string, EntityLinkNote> | undefined> {
        try {
            const row = await this.transaction('r', this.entityLinkNotes, async () => {
                return await this.entityLinkNotes
                    .where({ featureQID, propertyPID, language })
                    .and(row => linkedEntityQIDs.difference(row.linkedEntityQIDs).size === 0)
                    .first();
            });
            return row?.notes;
        } catch (e) {
            console.error("Failed getting statement entity from cache", e);
            return undefined;
        }
    }

    public async addEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQIDs: Set<string>, language: string, notes?: Record<string, EntityLinkNote>) {
        try {
            await this.transaction('rw', this.entityLinkNotes, async () => {
                await this.entityLinkNotes.add({ propertyPID, featureQID, linkedEntityQIDs, notes, language, timestamp: new Date().toISOString() });
            });
        } catch (e) {
            console.error("Failed adding stats to cache", e);
        }
    }
}