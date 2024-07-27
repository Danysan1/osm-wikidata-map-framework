import Dexie, { Table } from 'dexie';
import type { BBox } from 'geojson';
import type { EtymologyResponse } from '../model/EtymologyResponse';

type MapRow = EtymologyResponse & { id?: number };

export class MapDatabase extends Dexie {
    public maps!: Table<MapRow, number>;

    public constructor() {
        super("MapDatabase");

        this.version(6).stores({
            //maps: "++id, [sourcePresetID+backEndID+onlyCentroids+language]" // Does not work: https://stackoverflow.com/a/56661425
            maps: "++id, [sourcePresetID+backEndID+language]"
        });
    }

    public async clearMaps(maxHours?: number) {
        await this.transaction('rw', this.maps, async () => {
            if (maxHours) {
                const threshold = new Date(Date.now() - 1000 * 60 * 60 * maxHours),
                    count = await this.maps.filter(row => row.timestamp !== undefined && new Date(row.timestamp) < threshold).delete();
                if (process.env.NODE_ENV === 'development') console.debug("Evicted old maps from indexedDB", { maxHours, count, threshold });
            } else {
                await this.maps.clear();
                if (process.env.NODE_ENV === 'development') console.debug("Cleared all maps from indexedDB");
            }
        });
    }

    public async getMap(sourcePresetID: string, backEndID: string, onlyCentroids: boolean, bbox: BBox, language?: string): Promise<MapRow | undefined> {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        try {
            return await this.transaction('r', this.maps, async () => {
                return await this.maps
                    .where({ sourcePresetID, backEndID, language })
                    .and(map => { // Find elements whose bbox includes the given bbox and that are not truncated
                        if (!map.bbox || map.onlyCentroids !== onlyCentroids)
                            return false;

                        const [mapMinLon, mapMinLat, mapMaxLon, mapMaxLat] = map.bbox,
                            mapIncludesBBox = !map.truncated && mapMinLon <= minLon && mapMinLat <= minLat && mapMaxLon >= maxLon && mapMaxLat >= maxLat,
                            mapIncludedInBBoxIsTruncated = !!map.truncated && minLon <= mapMinLon && minLat <= mapMinLat && maxLon >= mapMaxLon && maxLat >= mapMaxLat;
                        return mapIncludesBBox || mapIncludedInBBoxIsTruncated;
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

