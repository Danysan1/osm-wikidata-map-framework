import Dexie, { Table } from 'dexie';
import { debug, getConfig } from '../config';
import type { EtymologyResponse } from '../model/EtymologyResponse';
import type { BBox } from 'geojson';

type MapRow = EtymologyResponse & { id?: number };

export class MapDatabase extends Dexie {
    public maps!: Table<MapRow, number>;

    public constructor() {
        super("MapDatabase");
        this.version(3).stores({
            maps: "++id, [backEndID+language]"
        });

        setTimeout(async () => {
            this.transaction('rw', this.maps, async () => {
                const maxHours = parseInt(getConfig("cache_timeout_hours") || "24"),
                    threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                    count = await this.maps.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                if (debug) console.info("Evicted old maps from indexedDB", { count, maxHours, threshold });
            });
        }, 10_000);
    }

    public async getMap(backEndID: string, bbox: BBox, language?: string): Promise<MapRow | undefined> {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        try {
            return await this.transaction('r', this.maps, async () => {
                return await this.maps
                    .where({ backEndID, language })
                    .and(map => {
                        if (!map.bbox)
                            return false;
                        const [mapMinLon, mapMinLat, mapMaxLon, mapMaxLat] = map.bbox,
                            mapIncludesBBox = !map.truncated && mapMinLon <= minLon && mapMinLat <= minLat && mapMaxLon >= maxLon && mapMaxLat >= maxLat,
                            mapIncludedinBBoxIsTruncated = !!map.truncated && minLon <= mapMinLon && minLat <= mapMinLat && maxLon >= mapMaxLon && maxLat >= mapMaxLat;
                        return mapIncludesBBox || mapIncludedinBBoxIsTruncated;
                    })
                    .first();
            });
        } catch (e) {
            console.error("Failed getting map from cache", e);
            return undefined;
        }
    }

    public async addMap(map: MapRow) {
        map.id = undefined;
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

