import { IControl, Map } from 'mapbox-gl';

export class LinkControl implements IControl {
    private _container?: HTMLDivElement;
    private _anchor?: HTMLAnchorElement;
    private _iconUrl: string;
    private _title: string;
    private _initialUrl?: string;

    constructor(iconUrl: string, title: string, url?: string) {
        this._iconUrl = iconUrl;
        this._title = title;
        this._initialUrl = url;
    }

    onAdd(map: Map): HTMLElement {
        this._container = document.createElement("div");
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl hiddenElement';

        this._anchor = document.createElement("a");
        this._anchor.title = this._title;
        this._anchor.ariaLabel = this._title;
        this._anchor.role = "button";
        this._anchor.target = "_blank";
        this._container.appendChild(this._anchor);

        const img = document.createElement("img");
        img.src = this._iconUrl;
        img.className = "mapboxgl-ctrl-icon";
        this._anchor.appendChild(img);

        return this._container;
    }

    onRemove(map: Map) {
        //
    }

    setURL(url: string) {
        if (this._anchor)
            this._anchor.href = url;
    }

    show(show = true) {
        if (show)
            this._container?.classList?.remove("hiddenElement");
        else
            this._container?.classList?.add("hiddenElement");
    }
}