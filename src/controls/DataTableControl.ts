import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent, Popup } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent, Popup } from 'mapbox-gl';

import { debug } from '../config';
import { logErrorMessage } from '../monitoring';
import { EtymologyFeature, EtymologyResponse } from '../generated/owmf';
import { GeoJSON, Feature } from 'geojson';
import { featureToButtonsDomElement } from '../components/FeatureButtonsElement';

export class DataTableControl implements IControl {
    private container?: HTMLDivElement;
    private button?: HTMLButtonElement;
    private title: string;
    private sourceId: string;
    private map?: Map;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(
        title: string,
        sourceId: string,
        minZoomLevel = 0
    ) {
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
        this.map = map;

        this.container = document.createElement("div");
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl';

        this.button = document.createElement("button");
        this.button.title = this.title;
        this.button.ariaLabel = this.title;
        this.button.addEventListener("click", () => {
            this.openTable();
            return false;
        });

        const icon = document.createElement("img");
        icon.className  = "button_img";
        icon.alt = "Data table symbol";
        icon.src = "https://upload.wikimedia.org/wikipedia/commons/c/cc/Simple_icon_table.svg";
        this.button.appendChild(icon);

        this.container.appendChild(this.button);

        this.show(false);

        map.on("sourcedata", this.sourceDataHandler);
        map.on("moveend", this.moveEndHandler);

        return this.container;
    }

    onRemove(map: Map) {
        map.off("sourcedata", this.sourceDataHandler);
        map.off("moveend", this.moveEndHandler);

        this.container?.remove();
        this.container = undefined;

        this.map = undefined;
    }

    private show(show = true) {
        if (show)
            this.container?.classList?.remove("hiddenElement");
        else
            this.container?.classList?.add("hiddenElement");
    }

    private openTable() {
        const map = this.map,
            source = map?.getSource(this.sourceId)
        if (map !== undefined && source !== undefined) {
            const data = (source as any)._data as (GeoJSON & EtymologyResponse) | undefined;
            if (data !== undefined) {

                const table = document.createElement("table"),
                    thead = document.createElement("thead"),
                    head_tr = document.createElement("tr"),
                    tbody = document.createElement("tbody"),
                    popup = new Popup({
                        closeButton: true,
                        closeOnClick: true,
                        closeOnMove: true,
                        className: "owmf_data_table_popup"
                    });
                table.appendChild(thead);
                thead.appendChild(head_tr);
                table.appendChild(tbody);

                ["Name", "Alt names", "Wikidata", "Actions"].forEach(column => {
                    const th = document.createElement("th");
                    th.innerText = column;
                    head_tr.appendChild(th);
                });

                data.features?.forEach((f: EtymologyFeature) => {
                    const tr = document.createElement("tr");
                    tbody.appendChild(tr);

                    const name = f.properties?.name,
                        alt_names = f.properties?.alt_name,
                        feature_wikidata = document.createElement("a"),
                        linked_wikidata = document.createElement("ul"),
                        buttons = featureToButtonsDomElement(f, 15);
                        feature_wikidata.innerText = f.properties?.wikidata ?? "";
                        feature_wikidata.href = `https://www.wikidata.org/wiki/${f.properties?.wikidata}`;
                    f.properties?.etymologies?.forEach(etymology => {
                        const li = document.createElement("li"),
                            a = document.createElement("a");
                        a.innerText = etymology.wikidata ?? "";
                        a.href = `https://www.wikidata.org/wiki/${etymology.wikidata}`;
                        li.appendChild(a);
                        linked_wikidata.appendChild(li);
                    });
                    [name, alt_names, feature_wikidata, linked_wikidata, buttons].forEach(value => {
                        const td = document.createElement("td");
                        if (value instanceof HTMLElement)
                            td.appendChild(value);
                        else
                            td.innerText = value ?? "";
                        tr.appendChild(td);
                    });
                });

                popup.setLngLat(map.unproject([0, 0]))
                    .setDOMContent(table)
                    .addTo(map);
                if (debug) console.debug("DataTableControl", { source, popup })
                // console.table(data.features?.map(f => f.properties));
            }
        }
    }
}