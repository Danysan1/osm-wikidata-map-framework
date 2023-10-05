import { IControl, Map, MapLibreEvent as MapEvent } from 'maplibre-gl';

// import { IControl, Map, MapboxEvent as MapEvent } from 'mapbox-gl';

import { debug, getConfig } from '../config';
import { getCorrectFragmentParams } from '../fragment';

export class MapCompleteControl implements IControl {
    private container?: HTMLDivElement;
    private minZoomLevel: number;
    private mapComplete_theme: string;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(minZoomLevel: number) {
        const mapComplete_theme = getConfig("mapcomplete_theme");
        if (!mapComplete_theme)
            throw new Error("mapcomplete_theme not set in config");
        if (debug) console.debug("Initializing MapCompleteControl", { mapComplete_theme, minZoomLevel });
        this.minZoomLevel = minZoomLevel;
        this.mapComplete_theme = mapComplete_theme;
        this.moveEndHandler = e => this.show(e.target.getZoom() >= minZoomLevel);
    }

    onAdd(map: Map): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl';

        const button = document.createElement("button");
        button.title = "MapComplete";
        button.ariaLabel = "MapComplete";
        button.addEventListener("click", () => this.openMapComplete());

        const icon = document.createElement("img");
        icon.className = "button_img";
        icon.alt = "Data table symbol";
        icon.src = "img/mapcomplete.svg";
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

    private openMapComplete() {
        const { lon, lat, zoom } = getCorrectFragmentParams();
        window.open(`https://mapcomplete.org/${this.mapComplete_theme}?z=${zoom}&lat=${lat}&lon=${lon}`);
    }
}