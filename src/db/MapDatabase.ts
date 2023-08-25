import Dexie, { Table } from 'dexie';
import { debug, getConfig } from '../config';
import { EtymologyResponse } from '../generated/owmf';
import { BBox, GeoJSON } from 'geojson';

type MapRow = GeoJSON & EtymologyResponse & { id?: number };

export class MapDatabase extends Dexie {
    public maps!: Table<MapRow, number>;

    public constructor() {
        super("MapDatabase");
        this.version(3).stores({
            maps: "++id, [sourceID+language]"
        });

        setTimeout(async () => {
            const maxHours = parseInt(getConfig("cache_timeout_hours") || "24"),
                threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                count = await this.maps.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
            if (debug) console.info("Evicted old maps from indexedDB", { count, maxHours, threshold });
        }, 10_000);
    }

    public async getMap(sourceID: string, bbox: BBox, language?: string): Promise<GeoJSON & EtymologyResponse | undefined> {
        try {
            return await this.transaction('r', this.maps, async () => {
                return await this.maps
                    .where({ "sourceID": sourceID, "language": language })
                    .and(map => map.bbox?.length === 4 && map.bbox[0] <= bbox[0] && map.bbox[1] <= bbox[1] && map.bbox[2] >= bbox[2] && map.bbox[3] >= bbox[3])
                    .first();
            });
        } catch (e) {
            console.error("Failed getting map from cache", e);
            return undefined;
        }
    }

    public async addMap(map: GeoJSON & EtymologyResponse) {
        if (map.timestamp === undefined)
            map.timestamp = new Date().toISOString();
        try {
            await this.transaction('rw', this.maps, async () => {
                await this.maps.add(map);
            });
        } catch (e) {
            console.error("Failed adding map to cache", e);
        }
    }
}

