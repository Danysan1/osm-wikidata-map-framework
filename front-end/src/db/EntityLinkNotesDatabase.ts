import Dexie, { Table } from "dexie";
import type { EntityLinkNotes } from "../model/LinkedEntity";

interface EntityLinkNotesRow {
    id?: number;
    featureQID: string;
    propertyPID: string;
    linkedEntityQID: string;
    language: string;
    notes?: EntityLinkNotes;
    timestamp: string;
}

export class EntityLinkNotesDatabase extends Dexie {
    public entityLinkNotes!: Table<EntityLinkNotesRow, number>;

    public constructor() {
        super("EntityLinkNotesDatabase");
        this.version(2).stores({
            entityLinkNotes: "++id, [featureQID+propertyPID+linkedEntityQID+language]",
        });
    }

    public async clear(maxHours?: number) {
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : new Date(0);
        await this.transaction('rw', this.entityLinkNotes, async () => {
            const count = await this.entityLinkNotes.filter(row => !row.timestamp || new Date(row.timestamp) < threshold).delete();
            console.debug("Evicted old entityLinkNotes from indexedDB", { count, threshold });
        });
    }

    public async getEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQID: string, language: string): Promise<EntityLinkNotes | undefined> {
        try {
            const row = await this.transaction('r', this.entityLinkNotes, async () => {
                return await this.entityLinkNotes.where({ featureQID, propertyPID, linkedEntityQID, language }).first();
            });
            return row?.notes;
        } catch (e) {
            console.error("Failed getting statement entity from cache", e);
            return undefined;
        }
    }

    public async addEntityLinkNotes(featureQID: string, propertyPID: string, linkedEntityQID: string, language: string, notes?: EntityLinkNotes) {
        try {
            await this.transaction('rw', this.entityLinkNotes, async () => {
                await this.entityLinkNotes.add({ propertyPID, featureQID, linkedEntityQID, notes, language, timestamp: new Date().toISOString() });
            });
        } catch (e) {
            console.error("Failed adding stats to cache", e);
        }
    }
}