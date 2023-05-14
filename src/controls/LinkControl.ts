import { IControl, Map, MapSourceDataEvent, MapboxEvent } from 'mapbox-gl';
import { debugLog } from '../config';

export class LinkControl implements IControl {
    private container?: HTMLDivElement;
    private anchor?: HTMLAnchorElement;
    private iconUrl: string;
    private title: string;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapboxEvent) => void;

    constructor(iconUrl: string, title: string, sourceId: string, mapEventField: string, baseUrl: string, minZoom: number) {
        this.iconUrl = iconUrl;
        this.title = title;
        this.sourceDataHandler = this.createSourceDataHandler(sourceId, mapEventField, baseUrl).bind(this);
        this.moveEndHandler = this.createMoveEndHandler(minZoom).bind(this);
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

    createSourceDataHandler(sourceId: string, mapEventField: string, baseUrl: string) {
        return async (e: MapSourceDataEvent) => {
            if (!e.isSourceLoaded || e.dataType != "source" || e.sourceId != sourceId)
                return;

            try {
                const response = await fetch((e.source as any).data, {
                    mode: "same-origin",
                    cache: "only-if-cached",
                });
                const content = await response.json();
                if (!content.metadata) {
                    debugLog("Missing metadata, hiding");
                    this.show(false);
                } else if (!content.metadata[mapEventField]) {
                    debugLog("Missing query field, hiding", { content, mapEventField });
                    this.show(false);
                } else {
                    const encodedQuery = encodeURIComponent(content.metadata[mapEventField]),
                        linkUrl = baseUrl + encodedQuery;
                    debugLog("Query field found, showing URL", { linkUrl, mapEventField });
                    this.setURL(linkUrl);
                    this.show();
                }
            } catch (err) {
                console.error(err);
                this.show(false);
            }
        }
    }

    createMoveEndHandler(minZoomLevel: number) {
        return (e: MapboxEvent) => {
            if (e.target.getZoom() < minZoomLevel)
                this.show(false);
        }
    }
}