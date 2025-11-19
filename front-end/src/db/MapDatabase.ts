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
        const threshold = maxHours ? new Date(Date.now() - 1000 * 60 * 60 * maxHours) : null;
        await this.transaction('rw', this.maps, async () => {
            const count = await this.maps.filter(row => !row.timestamp || !threshold || new Date(row.timestamp) < threshold).delete();
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
                            mapIncludesBBox = mapMinLon <= minLon && mapMinLat <= minLat && mapMaxLon >= maxLon && mapMaxLat >= maxLat,
                            mapIsIncludedInBBox = minLon <= mapMinLon && minLat <= mapMinLat && maxLon >= mapMaxLon && maxLat >= mapMaxLat;
                        return map.truncated ? mapIsIncludedInBBox : mapIncludesBBox;
                        // If the map for this bbox is truncated, there is no point in requesting a larger bbox that includes it
                        // (it would be truncated as well, with the same number of features)
                        // so in that case we return the truncated map as valid
                        // The same doesn't apply to partial results (map.partial==true): these might be combined results with one source that would yield more data at lower zoom.
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
        row.timestamp ??= new Date().toISOString();

        try {
            await this.transaction('rw', this.maps, async () => {
                await this.maps.add(row);
            });
        } catch (e) {
            console.error("Failed adding map to cache", e);
        }
    }
}

