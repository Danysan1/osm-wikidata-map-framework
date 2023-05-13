import { IControl, Map, MapSourceDataEvent } from 'mapbox-gl';

export class LinkControl implements IControl {
    private container?: HTMLDivElement;
    private anchor?: HTMLAnchorElement;
    private iconUrl: string;
    private title: string;
    private sourceDataHandler?: (e: MapSourceDataEvent) => void;

    constructor(iconUrl: string, title: string, sourceId?: string, mapEventField?: string) {
        this.iconUrl = iconUrl;
        this.title = title;
        if (sourceId && mapEventField)
            this.sourceDataHandler = this.createSourceDataHandler(sourceId, mapEventField).bind(this);
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

        if (this.sourceDataHandler)
            map.on("sourcedata", this.sourceDataHandler);

        return this.container;
    }

    onRemove(map: Map) {
        if (this.sourceDataHandler)
            map.off("sourcedata", this.sourceDataHandler);
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

    createSourceDataHandler(sourceId: string, mapEventField: string) {
        return (e: MapSourceDataEvent) => {
            if (!e.isSourceLoaded || e.dataType != "source" || e.sourceId != sourceId)
                return;

            console.info(mapEventField, e);
            //TODO
        }
    }
}