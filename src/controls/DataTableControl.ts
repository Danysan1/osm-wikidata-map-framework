import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent } from 'mapbox-gl';

import { debug } from '../config';
import { logErrorMessage } from '../monitoring';
import { EtymologyResponse } from '../generated/owmf';
import { GeoJSON } from 'geojson';

export class DataTableControl implements IControl {
    private container?: HTMLDivElement;
    private button?: HTMLButtonElement;
    private icon: string;
    private title: string;
    private sourceId: string;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(
        icon: string,
        title: string,
        sourceId: string,
        minZoomLevel = 0
    ) {
        this.icon = icon;
        this.title = title;
        this.sourceId = sourceId;

        this.sourceDataHandler = e => {
            if (e.isSourceLoaded && e.dataType === "source" && this.sourceId === e.sourceId)
                this.show(true);
        };

        this.moveEndHandler = e => {
            if (e.target.getZoom() < minZoomLevel)
                this.show(false);
        }
    }

    onAdd(map: Map): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl';

        this.button = document.createElement("button");
        this.button.title = this.title;
        this.button.ariaLabel = this.title;
        this.button.innerText = this.icon;
        this.button.addEventListener("click", () => {
            const source = map.getSource(this.sourceId)
            if (source !== undefined) {
                const data = (source as any)._data as (GeoJSON & EtymologyResponse) | undefined;
                console.debug("DataTableControl", source)
                console.table(data?.features?.map(f => f.properties));
            }
            return false;
        });
        this.container.appendChild(this.button);

        this.show(false);

        map.on("sourcedata", this.sourceDataHandler);
        map.on("moveend", this.moveEndHandler);

        return this.container;
    }

    onRemove(map: Map) {
        this.container?.remove();
        map.off("sourcedata", this.sourceDataHandler);
        map.off("moveend", this.moveEndHandler);
    }

    show(show = true) {
        if (show)
            this.container?.classList?.remove("hiddenElement");
        else
            this.container?.classList?.add("hiddenElement");
    }
}