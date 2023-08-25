import Dexie, { Table } from 'dexie';
import { debug } from '../config';
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
    }

    public async getMap(sourceID: string, bbox: BBox, language?: string, maxHours?: number): Promise<GeoJSON & EtymologyResponse | undefined> {
        try {
            const row = await this.transaction('r', this.maps, async () => {
                return await this.maps
                    .where({ "sourceID": sourceID, "language": language })
                    .and(map => map.bbox?.length === 4 && map.bbox[0] <= bbox[0] && map.bbox[1] <= bbox[1] && map.bbox[2] >= bbox[2] && map.bbox[3] >= bbox[3])
                    .first();
            });

            const outdated = maxHours && row?.timestamp && new Date(row.timestamp) < new Date(Date.now() - 1000 * 60 * maxHours)
            if (outdated && row.id) {
                if (debug) console.info("Evicting old map from cache", row);
                await this.transaction("rw", this.maps, async () => {
                    if (row.id) await this.maps.delete(row.id);
                });
                return undefined;
            }

            return row;
        } catch (e) {
            console.error("Failed getting map from cache", e);
            return undefined;
        }
    }

    public async addMap(map: GeoJSON & EtymologyResponse) {
        try {
            await this.transaction('rw', this.maps, async () => {
                await this.maps.add(map);
            });
        } catch (e) {
            console.error("Failed adding map to cache", e);
        }
    }
}

