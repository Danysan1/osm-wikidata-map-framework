import { IControl, Map, MapLibreEvent as MapEvent } from 'maplibre-gl';

// import { IControl, Map, MapboxEvent as MapEvent } from 'mapbox-gl';

import { debug, getConfig } from '../config';
import { getCorrectFragmentParams } from '../fragment';

export class OsmWikidataMatcherControl implements IControl {
    private container?: HTMLDivElement;
    private moveEndHandler: (e: MapEvent) => void;

    constructor() {
        const minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9");
        if (debug) console.debug("Initializing OsmWikidataMatcherControl", { minZoomLevel });
        this.moveEndHandler = e => this.show(e.target.getZoom() >= minZoomLevel);
    }

    onAdd(map: Map): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl osm-wd-matcher-ctrl';

        const button = document.createElement("button");
        button.title = "OSM <-> Wikidata matcher";
        button.ariaLabel = "OSM <-> Wikidata matcher";
        button.addEventListener("click", () => this.openMatcher());

        const icon = document.createElement("img");
        icon.className = "button_img";
        icon.alt = "Data table symbol";
        icon.src = "img/osm-wd-matcher.png";
        button.appendChild(icon);

        this.container.appendChild(button);

        const minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9");
        this.show(map.getZoom() >= minZoomLevel);

        map.on("moveend", this.moveEndHandler);

        return this.container;
    }

    onRemove(map: Map) {
        this.container?.remove();
        map.off("moveend", this.moveEndHandler);
    }

    private show(show = true) {
        if (show)
            this.container?.classList?.remove("hiddenElement");
        else
            this.container?.classList?.add("hiddenElement");
    }

    private openMatcher() {
        const { lon, lat, zoom } = getCorrectFragmentParams();
        window.open(`https://map.osm.wikidata.link/map/${zoom}/${lat}/${lon}`);
    }
}