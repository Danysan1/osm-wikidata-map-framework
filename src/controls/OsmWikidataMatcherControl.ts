import type { IControl, Map, MapLibreEvent as MapEvent } from 'maplibre-gl';
import { UrlFragment } from '../UrlFragment';

const fragment = new UrlFragment();

export class OsmWikidataMatcherControl implements IControl {
    private container?: HTMLDivElement;
    private readonly minZoomLevel: number;
    private readonly moveEndHandler: (e: MapEvent) => void;

    constructor(minZoomLevel: number) {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing OsmWikidataMatcherControl", { minZoomLevel });
        this.minZoomLevel = minZoomLevel;
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
        icon.loading = "lazy";
        icon.width = 23;
        icon.height = 23;
        button.appendChild(icon);

        this.container.appendChild(button);

        this.show(map.getZoom() >= this.minZoomLevel);

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
        const { lon, lat, zoom } = fragment.getCorrectFragmentParams();
        window.open(`https://map.osm.wikidata.link/map/${zoom.toFixed()}/${lat}/${lon}`);
    }
}