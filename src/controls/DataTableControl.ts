import { IControl, Map, MapSourceDataEvent, MapLibreEvent as MapEvent, Popup } from 'maplibre-gl';

// import { IControl, Map, MapSourceDataEvent, MapboxEvent as MapEvent, Popup } from 'mapbox-gl';

import type { Etymology } from '../model/Etymology';
import type { EtymologyFeature } from '../model/EtymologyResponse';
import { featureToButtonsDomElement } from '../components/FeatureButtonsElement';
import { getLanguage, loadTranslator } from '../i18n';

export class DataTableControl implements IControl {
    private container?: HTMLDivElement;
    private button?: HTMLButtonElement;
    private layers: string[];
    private map?: Map;
    private sourceDataHandler: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapEvent) => void;

    constructor(sourceId: string, layerIDs: string[], minZoomLevel = 0) {
        this.layers = layerIDs;

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
        void loadTranslator().then(t => {
            if (this.button) {
                const title = t("data_table.view_data_table", "View the data in a table");
                this.button.title = title;
                this.button.ariaLabel = title;
            }
        });

        const icon = document.createElement("img");
        icon.className = "button_img";
        icon.alt = "Data table symbol";
        icon.src = "img/Simple_icon_table.svg";
        icon.loading = "lazy";
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

            void this.fillTable(table, features, currentZoomLevel);

            popup.setLngLat(map.unproject([0, 0]))
                .setDOMContent(table)
                .addTo(map);
            if (process.env.NODE_ENV === 'development') console.debug("DataTableControl", { popup })
            // console.table(data.features?.map(f => f.properties));
        }
    }

    private async fillTable(table: HTMLTableElement, features: EtymologyFeature[], currentZoomLevel: number) {
        const thead = document.createElement("thead"),
            head_row = document.createElement("tr"),
            namesHeadCell = document.createElement("th"),
            actionsHeadCell = document.createElement("th"),
            linkedEntitiesHeadCell = document.createElement("th"),
            tbody = document.createElement("tbody"),
            t = await loadTranslator(),
            wikidataIDs = new Set<string>(),
            localNameKey = "name:" + getLanguage();
        let anyLinkedEntity = false;

        table.appendChild(thead);
        thead.appendChild(head_row);
        table.appendChild(tbody);

        /* Add the table body */
        features?.forEach(f => {
            const row = document.createElement("tr"),
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                id = f.properties?.wikidata?.toString() || f.properties?.name?.replaceAll('"', "");
            if (id) {
                if (process.env.NODE_ENV === 'development') console.debug("createFeatureRow", { id, f });
                if (tbody.querySelector(`[data-feature-id="${id}"]`) !== null)
                    return;
                row.dataset.featureId = id;
            }
            tbody.appendChild(row);

            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            const mainName = f.properties?.name || f.properties?.[localNameKey] || f.properties?.["name:en"],
                nameArray: string[] = [];
            if (f.properties?.alt_name)
                nameArray.push(...f.properties.alt_name.split(";"));
            if (typeof mainName === "string") {
                const lowerName = mainName.toLowerCase().replaceAll('“', '"').replaceAll('”', '"'),
                    includedInAnyAltName = nameArray.some(alt_name =>
                        alt_name.toLowerCase().replaceAll('“', '"').replaceAll('”', '"').includes(lowerName)
                    );
                if (!includedInAnyAltName)
                    nameArray.push(mainName);
            }

            const names = nameArray.join(" / "),
                destinationZoomLevel = Math.max(currentZoomLevel, 18),
                etymologies = typeof f.properties?.etymologies === "string" ? JSON.parse(f.properties?.etymologies) as Etymology[] : f.properties?.etymologies,
                featureWikidataIDs = etymologies?.map(e => e.wikidata ?? "").filter(id => id != ""),
                namesCell = document.createElement("td"),
                actionsCell = document.createElement("td"),
                linkedCell = document.createElement("td");

            namesCell.innerText = names;
            row.appendChild(namesCell);

            actionsCell.appendChild(featureToButtonsDomElement(f, destinationZoomLevel));
            row.appendChild(actionsCell);

            if (!!featureWikidataIDs?.length || !!f.properties?.text_etymology) {
                if (featureWikidataIDs?.length === 1)
                    linkedCell.appendChild(this.wikidataLink(featureWikidataIDs[0]));
                else if (featureWikidataIDs?.length)
                    linkedCell.appendChild(this.etymologyLinks(featureWikidataIDs));
                else if (f.properties?.text_etymology)
                    linkedCell.innerText = f.properties.text_etymology;

                row.appendChild(linkedCell);
                anyLinkedEntity = true;
            }
            featureWikidataIDs?.forEach(id => wikidataIDs.add(id));
        });

        /* Add the table header */
        namesHeadCell.innerText = t("data_table.names", "Names");
        head_row.appendChild(namesHeadCell);
        actionsHeadCell.innerText = t("data_table.actions", "Actions");
        head_row.appendChild(actionsHeadCell);
        if (anyLinkedEntity) {
            linkedEntitiesHeadCell.innerText = t("data_table.linked_entities", "Linked entities");
            head_row.appendChild(linkedEntitiesHeadCell);
        }

        void this.downloadLinkLabels(wikidataIDs, tbody);
    }

    private etymologyLinks(wikidataIDs: string[]): HTMLElement {
        const ul = document.createElement("ul");
        wikidataIDs.forEach(id => {
            const li = document.createElement("li");
            li.appendChild(this.wikidataLink(id));
            ul.appendChild(li);
        });
        return ul;
    }

    private wikidataLink(wikidataID: string): HTMLAnchorElement {
        const a = document.createElement("a");
        a.dataset.wikidataId = wikidataID;
        a.innerText = wikidataID;
        a.title = wikidataID;
        a.href = `https://www.wikidata.org/wiki/${wikidataID}`;
        return a;
    }

    private async downloadLinkLabels(wikidataIDs: Set<string>, container: HTMLElement) {
        if (wikidataIDs.size > 0) {
            const detailsService = new (await import("../services")).WikidataDetailsService(),
                details = await detailsService.fetchEtymologyDetails(wikidataIDs);

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
        }
    }
}