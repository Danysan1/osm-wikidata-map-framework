import Dexie, { Table } from 'dexie';
import type { BBox } from 'geojson';
import type { OwmfResponse } from '../model/OwmfResponse';

type MapRow = OwmfResponse & { id?: number };

export class MapDatabase extends Dexie {
    public maps!: Table<MapRow, number>;

    public constructor() {
        super("MapDatabase");
        this.version(8).stores({
            //maps: "++id, [sourcePresetID+backEndID+onlyCentroids+language]" // Does not work: https://stackoverflow.com/a/56661425
            maps: "++id, [sourcePresetID+backEndID+language+year]",
        });
    }

    public async clear(maxHours?: number) {
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : new Date(0);
        await this.transaction('rw', this.maps, async () => {
            const count = await this.maps.filter(row => !row.timestamp || new Date(row.timestamp) < threshold).delete();
            console.debug("Evicted old maps from indexedDB", { count, threshold });
        });
    }

    public async getMap(sourcePresetID: string, backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<MapRow | undefined> {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        try {
            return await this.transaction('r', this.maps, async () => {
                return await this.maps
                    .where({ sourcePresetID, backEndID, language, year })
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

    public async addMap(map: OwmfResponse) {
        const row: MapRow = { ...map, id: undefined };
        if (row.timestamp === undefined)
            row.timestamp = new Date().toISOString();

        try {
            await this.transaction('rw', this.maps, async () => {
                await this.maps.add(row);
            });
        } catch (e) {
            console.error("Failed adding map to cache", e);
        }
    }
}

