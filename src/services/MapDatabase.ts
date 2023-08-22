import Dexie, { Table } from 'dexie';
import { EtymologyResponse } from '../generated/owmf';
import { GeoJSON } from 'geojson';

export class MapDatabase extends Dexie {
    public maps!: Table<GeoJSON & EtymologyResponse, number>;

    public constructor() {
        super("MapDatabase");
        this.version(3).stores({
            maps: "++id, [sourceID+language+bbox]"
        });
    }

    public async getMap(sourceID: string, bbox: number[], language?: string): Promise<GeoJSON & EtymologyResponse | undefined> {
        const out = await this.transaction('r', this.maps, async () => {
            return this.maps
                .where({ "sourceID": sourceID, "language": language, "bbox": bbox })
                .first();
        }).catch(e => {
            console.error(e.stack || e);
        });
        if (!out)
            return undefined;
        return out;
    }

    public addMap(map: GeoJSON & EtymologyResponse) {
        this.transaction('rw', this.maps, async () => {
            return this.maps.add(map);
        }).catch(e => {
            console.error(e.stack || e);
        });
    }
}

