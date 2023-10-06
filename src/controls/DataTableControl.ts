import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent, Popup } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent, Popup } from 'mapbox-gl';

import { debug } from '../config';
import { Etymology, EtymologyFeature, EtymologyResponse } from '../generated/owmf';
import { featureToButtonsDomElement } from '../components/FeatureButtonsElement';

export class DataTableControl implements IControl {
    private container?: HTMLDivElement;
    private button?: HTMLButtonElement;
    private title: string;
    private layers: string[];
    private map?: Map;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(title: string, sourceId: string, minZoomLevel = 0) {
        this.title = title;
        this.layers = [
            sourceId + "_layer_point",
            sourceId + "_layer_lineString",
            sourceId + "_layer_polygon_fill"
        ];

        this.sourceDataHandler = e => {
            if (e.isSourceLoaded && e.dataType === "source" && sourceId === e.sourceId)
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
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl data-table-ctrl';

        this.button = document.createElement("button");
        this.button.title = this.title;
        this.button.ariaLabel = this.title;
        this.button.addEventListener("click", () => this.openTable(map.getZoom()));

        const icon = document.createElement("img");
        icon.className = "button_img";
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

    private openTable(currentZoomLevel: number) {
        const map = this.map;
        if (map !== undefined) {
            const features = map.queryRenderedFeatures({ layers: this.layers }),
                table = document.createElement("table"),
                thead = document.createElement("thead"),
                head_tr = document.createElement("tr"),
                tbody = document.createElement("tbody"),
                popup = new Popup({
                    closeButton: true,
                    closeOnClick: true,
                    closeOnMove: true,
                    className: "owmf_data_table_popup"
                });
            table.className = "owmf_data_table";
            table.appendChild(thead);
            thead.appendChild(head_tr);
            table.appendChild(tbody);

            ["Name", "Alt names", "Actions", "Linked entities"].forEach(column => {
                const th = document.createElement("th");
                th.innerText = column;
                head_tr.appendChild(th);
            });

            features?.forEach(f => this.createFeatureRow(f, tbody, currentZoomLevel));

            popup.setLngLat(map.unproject([0, 0]))
                .setDOMContent(table)
                .addTo(map);
            if (debug) console.debug("DataTableControl", { popup })
            // console.table(data.features?.map(f => f.properties));
        }
    }

    private createFeatureRow(feature: EtymologyFeature, tbody: HTMLTableSectionElement, currentZoomLevel: number) {
        const tr = document.createElement("tr"),
            id = feature.properties?.wikidata?.toString() || feature.properties?.name?.replaceAll('"', "");
        if (id) {
            if (debug) console.debug("createFeatureRow", { id, feature });
            if (tbody.querySelector(`[data-feature-id="${id}"]`) !== null)
                return;
            tr.dataset.featureId = id;
        }
        tbody.appendChild(tr);

        const name = feature.properties?.name,
            alt_names = feature.properties?.alt_name,
            destinationZoomLevel = Math.max(currentZoomLevel, 18),
            buttons = featureToButtonsDomElement(feature, destinationZoomLevel),
            etymologies = typeof feature.properties?.etymologies === "string" ? JSON.parse(feature.properties?.etymologies) as Etymology[] : feature.properties?.etymologies;
        let linked_wikidata: HTMLAnchorElement | HTMLUListElement;
        if (etymologies?.length === 1) {
            linked_wikidata = this.etymologyLink(etymologies[0]);
        } else {
            linked_wikidata = document.createElement("ul");
            etymologies?.forEach(etymology => {
                const li = document.createElement("li");
                li.appendChild(this.etymologyLink(etymology));
                linked_wikidata.appendChild(li);
            });
        }
        [name, alt_names, buttons, linked_wikidata].forEach(value => {
            const td = document.createElement("td");
            if (value instanceof HTMLElement)
                td.appendChild(value);
            else
                td.innerText = value ?? "";
            tr.appendChild(td);
        });
    }

    private etymologyLink(etymology: Etymology): HTMLAnchorElement {
        const a = document.createElement("a");
        a.innerText = etymology.wikidata ?? "";
        a.href = `https://www.wikidata.org/wiki/${etymology.wikidata}`;
        return a;
    }
}