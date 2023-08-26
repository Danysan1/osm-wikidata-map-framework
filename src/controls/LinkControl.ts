import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent } from 'mapbox-gl';

import { debug } from '../config';
import { logErrorMessage } from '../monitoring';
import { EtymologyResponse } from '../generated/owmf';
import { GeoJSON } from 'geojson';

export class LinkControl implements IControl {
    private container?: HTMLDivElement;
    private anchor?: HTMLAnchorElement;
    private iconUrl: string;
    private title: string;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(
        iconUrl: string,
        title: string,
        sourceIds: string[],
        mapEventField: keyof EtymologyResponse,
        baseUrl: string,
        minZoomLevel = 0
    ) {
        this.iconUrl = iconUrl;
        this.title = title;
        this.sourceDataHandler = this.createSourceDataHandler(sourceIds, mapEventField, baseUrl).bind(this);
        this.moveEndHandler = this.createMoveEndHandler(minZoomLevel).bind(this);
    }

    onAdd(map: Map): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl';

        this.anchor = document.createElement("a");
        this.anchor.title = this.title;
        this.anchor.ariaLabel = this.title;
        this.anchor.role = "button";
        this.anchor.target = "_blank";
        this.container.appendChild(this.anchor);

        const img = document.createElement("img");
        img.src = this.iconUrl;
        img.className = "mapboxgl-ctrl-icon";
        this.anchor.appendChild(img);

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

    setURL(url: string) {
        if (this.anchor)
            this.anchor.href = url;
    }

    show(show = true) {
        if (show)
            this.container?.classList?.remove("hiddenElement");
        else
            this.container?.classList?.add("hiddenElement");
    }

    createSourceDataHandler(sourceIds: string[], mapEventField: keyof EtymologyResponse, baseUrl: string) {
        return async (e: MapSourceDataEvent) => {
            if (!e.isSourceLoaded || e.dataType !== "source" || !sourceIds.includes(e.sourceId))
                return;

            const data = (e.source as any)?.data;

            try {
                let content: GeoJSON & EtymologyResponse;
                if (typeof data === "object") {
                    content = data;
                } else if (typeof data === "string") {
                    const response = await fetch(data, {
                        mode: "same-origin",
                        cache: "only-if-cached",
                    });
                    content = await response.json();
                } else {
                    throw new Error("Invalid data type");
                }

                const query = content[mapEventField];
                if (typeof query !== "string" || !query.length) {
                    //if (enable_debug_log) console.info("Missing query field, hiding", { content, mapEventField });
                    this.show(false);
                } else {
                    const encodedQuery = encodeURIComponent(query),
                        linkUrl = baseUrl + encodedQuery;
                    if (debug) console.info("Query field found, showing URL", { linkUrl, mapEventField });
                    this.setURL(linkUrl);
                    this.show();
                }
            } catch (err) {
                logErrorMessage("Failed retrieving last etymologyMap response, make sure cache is enabled", "error", { err });
                this.show(false);
            }
        }
    }

    createMoveEndHandler(minZoomLevel: number) {
        return (e: MapEvent) => {
            if (e.target.getZoom() < minZoomLevel)
                this.show(false);
        }
    }
}