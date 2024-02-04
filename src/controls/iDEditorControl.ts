import type { IControl, Map, MapLibreEvent as MapEvent } from 'maplibre-gl';
import { getCorrectFragmentParams } from '../fragment';

export class iDEditorControl implements IControl {
    private container?: HTMLDivElement;
    private minZoomLevel: number;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(minZoomLevel: number) {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing iDEditorControl", { minZoomLevel });
        this.minZoomLevel = minZoomLevel;
        this.moveEndHandler = e => this.show(e.target.getZoom() >= minZoomLevel);
    }

    onAdd(map: Map): HTMLElement {
        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl id-editor-ctrl';

        const button = document.createElement("button");
        button.title = "iD editor";
        button.ariaLabel = "iD editor";
        button.addEventListener("click", () => this.openMatcher());

        const icon = document.createElement("img");
        icon.className = "button_img";
        icon.alt = "iD editor logo";
        icon.src = "img/OpenStreetMap-Editor_iD_Logo.svg";
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
        const { lon, lat, zoom } = getCorrectFragmentParams();
        window.open(`https://www.openstreetmap.org/edit?editor=id#map=${zoom.toFixed()}/${lat}/${lon}`);
    }
}