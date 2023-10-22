import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent, Popup } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent, Popup } from 'mapbox-gl';

import { debug } from '../config';
import { Etymology, EtymologyFeature, EtymologyResponse } from '../generated/owmf';
import { featureToButtonsDomElement } from '../components/FeatureButtonsElement';
import { WikidataService } from '../services/WikidataService';
import { WikidataDetailsService } from '../services/WikidataDetailsService';
import { loadTranslator } from '../i18n';

export class DataTableControl implements IControl {
    private container?: HTMLDivElement;
    private button?: HTMLButtonElement;
    private layers: string[];
    private map?: Map;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(sourceId: string, minZoomLevel = 0) {
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
        this.button.addEventListener("click", () => this.openTable(map.getZoom()));
        loadTranslator().then(t => {
            if (this.button) {
                const title = t("data_table.view_data_table", "View the data in a table");
                this.button.title = title;
                this.button.ariaLabel = title;
            }
        });

        const icon = document.createElement("img");
        icon.className = "button_img";
        icon.alt = "Data table symbol";
        icon.src = "https://upload.wikimedia.org/wikipedia/commons/c/cc/Simple_icon_table.svg";
        icon.width = 23;
        icon.height = 19;
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
            const features: EtymologyFeature[] = map.queryRenderedFeatures({ layers: this.layers }),
                table = document.createElement("table"),
                popup = new Popup({
                    closeButton: true,
                    closeOnClick: true,
                    closeOnMove: true,
                    className: "owmf_data_table_popup"
                });
            table.className = "owmf_data_table";

            this.fillTable(table, features, currentZoomLevel);

            popup.setLngLat(map.unproject([0, 0]))
                .setDOMContent(table)
                .addTo(map);
            if (debug) console.debug("DataTableControl", { popup })
            // console.table(data.features?.map(f => f.properties));
        }
    }

    private fillTable(table: HTMLTableElement, features: EtymologyFeature[], currentZoomLevel: number) {
        const thead = document.createElement("thead"),
            head_tr = document.createElement("tr"),
            tbody = document.createElement("tbody"),
            wikidataIDs = new Set<string>();

        table.appendChild(thead);
        thead.appendChild(head_tr);
        table.appendChild(tbody);

        loadTranslator().then(t => {
            [
                t("data_table.names", "Names"),
                t("data_table.actions", "Actions"),
                t("data_table.linked_entities", "Linked entities")
            ].forEach(column => {
                const th = document.createElement("th");
                th.innerText = column;
                head_tr.appendChild(th);
            });

            features?.forEach(f => {
                const tr = document.createElement("tr"),
                    id = f.properties?.wikidata?.toString() || f.properties?.name?.replaceAll('"', "");
                if (id) {
                    if (debug) console.debug("createFeatureRow", { id, f });
                    if (tbody.querySelector(`[data-feature-id="${id}"]`) !== null)
                        return;
                    tr.dataset.featureId = id;
                }
                tbody.appendChild(tr);

                const nameArray: string[] = [];
                if (f.properties?.alt_name)
                    nameArray.push(...f.properties.alt_name.split(";"));
                if (f.properties?.name) {
                    const name = f.properties.name.toLowerCase().replaceAll('“', '"').replaceAll('”', '"'),
                        includedInAnyAltName = nameArray.some(alt_name => alt_name.toLowerCase().includes(name));
                    if (!includedInAnyAltName)
                        nameArray.push(f.properties.name);
                }

                const names = nameArray.join(" / "),
                    destinationZoomLevel = Math.max(currentZoomLevel, 18),
                    buttons = featureToButtonsDomElement(f, destinationZoomLevel),
                    etymologies = typeof f.properties?.etymologies === "string" ? JSON.parse(f.properties?.etymologies) as Etymology[] : f.properties?.etymologies,
                    featureWikidataIDs = etymologies?.map(e => e.wikidata || "").filter(id => id != ""),
                    linked_wikidata = etymologies ? this.etymologyLinks(featureWikidataIDs) : undefined;
                featureWikidataIDs?.forEach(id => wikidataIDs.add(id));

                [names, buttons, linked_wikidata].forEach(value => {
                    const td = document.createElement("td");
                    if (value instanceof HTMLElement)
                        td.appendChild(value);
                    else
                        td.innerText = value ?? "";
                    tr.appendChild(td);
                });
            });
        });

        this.downloadLinkLabels(wikidataIDs, tbody);
    }

    private etymologyLinks(wikidataIDs?: string[]): HTMLElement | undefined {
        if (!wikidataIDs || wikidataIDs.length === 0) {
            return undefined;
        } else {
            const ul = document.createElement("ul");
            wikidataIDs.forEach(id => {
                const li = document.createElement("li");
                li.appendChild(this.wikidataLink(id));
                ul.appendChild(li);
            });
            return ul;
        }
    }

    private wikidataLink(wikidataID: string): HTMLAnchorElement {
        const a = document.createElement("a");
        a.dataset.wikidataId = wikidataID;
        a.innerText = wikidataID;
        a.title = wikidataID;
        a.href = `https://www.wikidata.org/wiki/${wikidataID}`;
        return a;
    }

    private downloadLinkLabels(wikidataIDs: Set<string>, container: HTMLElement) {
        if (wikidataIDs.size > 0) {
            new WikidataDetailsService().fetchEtymologyDetails(wikidataIDs).then(details => {
                wikidataIDs.forEach(wikidataID => {
                    if (wikidataID in details) {
                        const detail = details[wikidataID],
                            links = container.querySelectorAll<HTMLAnchorElement>(`a[data-wikidata-id="${detail.wikidata}"]`);
                        links.forEach(a => {
                            if (detail.name)
                                a.innerText = detail.name;
                        });
                    }
                });
            });
        }
    }
}