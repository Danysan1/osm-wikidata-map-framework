import { imageToDomElement } from "./CommonsImageElement";
import { debug } from "../config";
import { DatePrecision, EtymologyDetails } from "../feature.model";
import { setFragmentParams } from "../fragment";
import { translateContent, translateAnchorTitle } from "../i18n";
import { WikipediaService } from "../services/WikipediaService";

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 */
function formatDate(date: Date | string | number, precision?: DatePrecision): string {
    let dateObject: Date;
    const options: Intl.DateTimeFormatOptions = {};

    if (date instanceof Date) {
        dateObject = date;
    } else if (typeof date === 'string' && date.startsWith('-')) {
        dateObject = new Date(date.slice(1));
        dateObject.setFullYear(-dateObject.getFullYear());
    } else if (typeof date === 'string') {
        dateObject = new Date(date);
    } else if (typeof date === 'number') {
        // Convert the epoch timestamp to a Date: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_ecmascript_epoch_and_timestamps
        dateObject = new Date(date * 1000);
    } else {
        throw new Error("Invalid date parameter");
    }

    if (precision) {
        if (precision >= DatePrecision.second) options.second = 'numeric';
        if (precision >= DatePrecision.minute) options.minute = 'numeric';
        if (precision >= DatePrecision.hour) options.hour = 'numeric';
        if (precision >= DatePrecision.day) options.day = 'numeric';
        if (precision >= DatePrecision.month) options.month = 'numeric';
        options.year = 'numeric';
    }

    if (dateObject < new Date('0000-01-01T00:00:00')) {
        options.era = "short";
    }

    const out = dateObject.toLocaleDateString(document.documentElement.lang, options);
    //if (debug) console.info("formatDate", { date, precision, dateObject, options, out });
    return out;
}

/**
 * WebComponent to display an etymology
 */
export class EtymologyElement extends HTMLDivElement {
    private _currentZoom = 12.5;
    private _ety?: EtymologyDetails;

    constructor() {
        super();
        this.classList.add('etymology-container', 'hiddenElement', 'custom-component');
    }

    get currentZoom(): number {
        return this._currentZoom;
    }

    set currentZoom(currentZoom: number) {
        this._currentZoom = currentZoom;
        if (debug) console.info("EtymologyElement: setting currentZoom", { currentZoom });
        this.render();
    }

    get etymology(): EtymologyDetails | undefined {
        return this._ety;
    }

    set etymology(ety: EtymologyDetails | undefined) {
        if (!ety) {
            this._ety = undefined;
            if (debug) console.info("EtymologyElement: unsetting etymology");
        } else {
            this._ety = ety;
            if (debug) console.info("EtymologyElement: setting etymology", { ety });
        }
        this.render();
    }

    private render() {
        if (!this.etymology) {
            if (debug) console.info("EtymologyElement: no etymology, hiding");
            this.classList.add("hiddenElement");
            this.innerHTML = "";
            return;
        }

        const etymology_template = document.getElementById('etymology_template');
        if (!(etymology_template instanceof HTMLTemplateElement))
            throw new Error("Missing etymology template");

        const etyDomElement = etymology_template.content.cloneNode(true) as HTMLElement;
        //etyDomElement.dataset.et_id = this.etymology.et_id?.toString();
        //etyDomElement.dataset.wd_id = this.etymology.wd_id?.toString();

        const lang = document.documentElement.lang.split("-").at(0);
        if (debug) console.info("EtymologyElement", { ety: this.etymology, etyDomElement, lang });

        translateContent(etyDomElement, ".i18n_source", "feature_details.source", "Source:");
        translateContent(etyDomElement, ".i18n_location", "feature_details.location", "Location");
        translateAnchorTitle(etyDomElement, ".title_i18n_location", "feature_details.location", "Location");
        translateContent(etyDomElement, ".i18n_propagation", "etymology_details.propagation", "propagation");
        translateAnchorTitle(etyDomElement, ".title_i18n_propagation", "etymology_details.propagation_title", "Description of the propagation mechanism");

        const etymology_name = etyDomElement.querySelector<HTMLElement>('.etymology_name');
        if (!etymology_name) {
            console.warn("Missing etymology_name");
        } else if (this.etymology.name) {
            etymology_name.innerText = this.etymology.name;
            etymology_name.style.display = 'block';
        } else {
            etymology_name.style.display = 'none';
        }

        const etymology_description = etyDomElement.querySelector<HTMLElement>('.etymology_description');
        if (!etymology_description) {
            console.warn("Missing etymology_description");
        } else if (this.etymology.description) {
            etymology_description.innerText = this.etymology.description;
            etymology_description.style.display = 'block';
        } else {
            etymology_description.style.display = 'none';
        }

        const wikidata_button = etyDomElement.querySelector<HTMLAnchorElement>('.wikidata_button');
        if (!wikidata_button) {
            console.warn("Missing wikidata_button");
        } else if (this.etymology.wikidata) {
            wikidata_button.href = 'https://www.wikidata.org/wiki/' + this.etymology.wikidata
            wikidata_button.classList.remove("hiddenElement");
        } else {
            wikidata_button.classList.add("hiddenElement");
        }

        const entitree_button = etyDomElement.querySelector<HTMLAnchorElement>('.entitree_button');
        if (!entitree_button) {
            console.warn("Missing entitree_button");
        } else if (lang && this.etymology.wikidata && this.etymology.instanceID == "Q5") {
            entitree_button.href = `https://www.entitree.com/${lang}/family_tree/${this.etymology.wikidata}`;
            entitree_button.classList.remove("hiddenElement");
        } else {
            entitree_button.classList.add("hiddenElement");
        }

        const wikipedia_button = etyDomElement.querySelector<HTMLAnchorElement>('.wikipedia_button');
        if (!wikipedia_button) {
            console.warn("Missing wikipedia_button");
        } else if (this.etymology.wikipedia) {
            wikipedia_button.href = this.etymology.wikipedia.startsWith("http") ? this.etymology.wikipedia : `https://www.wikipedia.org/wiki/${this.etymology.wikipedia}`;
            wikipedia_button.classList.remove("hiddenElement");
        } else {
            wikipedia_button.classList.add("hiddenElement");
        }

        const commons_button = etyDomElement.querySelector<HTMLAnchorElement>('.commons_button');
        if (!commons_button) {
            console.warn("Missing commons_button");
        } else if (this.etymology.commons) {
            if (this.etymology.commons.startsWith("http"))
                commons_button.href = this.etymology.commons;
            else if (this.etymology.commons.startsWith("Category:"))
                commons_button.href = `https://commons.wikimedia.org/wiki/${this.etymology.commons}`;
            else
                commons_button.href = `https://commons.wikimedia.org/wiki/Category:${this.etymology.commons}`;
            commons_button.classList.remove("hiddenElement");
        } else {
            commons_button.classList.add("hiddenElement");
        }

        const location_button = etyDomElement.querySelector<HTMLAnchorElement>('.subject_location_button');
        if (!location_button) {
            console.warn("Missing location_button");
        } else {
            let ety_lat = NaN, ety_lon = NaN;
            if (this.etymology.wkt_coords) {
                const coords = /Point\(([-\dE.]+) ([-\dE.]+)\)/i.exec(this.etymology.wkt_coords),
                    coordsOk = !!coords && coords.length == 3,
                    strLon = coordsOk ? coords.at(1) : null,
                    strLat = coordsOk ? coords.at(2) : null;
                ety_lat = strLat ? parseFloat(strLat) : NaN;
                ety_lon = strLon ? parseFloat(strLon) : NaN;

                if (!isNaN(ety_lon) && !isNaN(ety_lat)) {
                    location_button.addEventListener("click", () => {
                        setFragmentParams(ety_lon, ety_lat, this.currentZoom);
                        return false;
                    });
                    location_button.classList.remove("hiddenElement");
                } else {
                    location_button.classList.add("hiddenElement");
                    console.warn("Failed converting wkt_coords:", {
                        et_id: this.etymology.et_id, ety_lat, ety_lon, wkt_coords: this.etymology.wkt_coords
                    });
                }
            } else {
                location_button.classList.add("hiddenElement");
            }
        }

        const wikipedia_extract = etyDomElement.querySelector<HTMLElement>('.wikipedia_extract');
        if (!wikipedia_extract) {
            console.warn("Missing wikipedia_extract");
        } else if (this.etymology.wikipedia) {
            new WikipediaService().fetchExtract(this.etymology.wikipedia)
                .then(res => {
                    wikipedia_extract.innerText = '📖 ' + res;
                })
                .catch(err => {
                    console.warn(err);
                    wikipedia_extract.style.display = 'none';
                });
        } else {
            wikipedia_extract.style.display = 'none';
        }

        const start_end_date = etyDomElement.querySelector<HTMLElement>('.start_end_date')
        if (!start_end_date) {
            console.warn("Missing start_end_date");
        } else if (this.etymology.birth_date || this.etymology.birth_place || this.etymology.death_date || this.etymology.death_place) {
            const birth_date = this.etymology.birth_date ? formatDate(this.etymology.birth_date, this.etymology.birth_date_precision) : "?",
                birth_place = this.etymology.birth_place ? this.etymology.birth_place : "?",
                death_date = this.etymology.death_date ? formatDate(this.etymology.death_date, this.etymology.death_date_precision) : "?",
                death_place = this.etymology.death_place ? this.etymology.death_place : "?";
            start_end_date.innerText = `📅 ${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
        } else if (this.etymology.start_date || this.etymology.end_date) {
            const start_date = this.etymology.start_date ? formatDate(this.etymology.start_date, this.etymology.start_date_precision) : "?",
                end_date = this.etymology.end_date ? formatDate(this.etymology.end_date, this.etymology.end_date_precision) : "?";
            start_end_date.innerText = `📅 ${start_date} - ${end_date}`;
        } else if (this.etymology.event_date) {
            const event_date = formatDate(this.etymology.event_date, this.etymology.event_date_precision);
            start_end_date.innerText = `📅 ${event_date}`
        } else {
            start_end_date.style.display = 'none';
        }

        const event_place = etyDomElement.querySelector<HTMLElement>('.event_place');
        if (!event_place) {
            console.warn("Missing event_place");
        } else if (this.etymology.event_place) {
            event_place.innerText = '📍 ' + this.etymology.event_place;
        } else {
            event_place.style.display = 'none';
        }

        const citizenship = etyDomElement.querySelector<HTMLElement>('.citizenship');
        if (!citizenship) {
            console.warn("Missing citizenship");
        } else if (this.etymology.citizenship) {
            citizenship.innerText = '🌍 ' + this.etymology.citizenship;
        } else {
            citizenship.style.display = 'none';
        }

        const gender = etyDomElement.querySelector<HTMLElement>('.gender');
        if (!gender) {
            console.warn("Missing gender");
        } else if (this.etymology.gender) {
            gender.innerText = '⚧️ ' + this.etymology.gender;
        } else {
            gender.style.display = 'none';
        }

        const occupations = etyDomElement.querySelector<HTMLElement>('.occupations');
        if (!occupations) {
            console.warn("Missing occupations");
        } else if (this.etymology.occupations) {
            occupations.innerText = '🛠️ ' + this.etymology.occupations;
        } else {
            occupations.style.display = 'none';
        }

        const prizes = etyDomElement.querySelector<HTMLElement>('.prizes');
        if (!prizes) {
            console.warn("Missing prizes");
        } else if (this.etymology.prizes) {
            prizes.innerText = '🏆 ' + this.etymology.prizes;
        } else {
            prizes.style.display = 'none';
        }

        const ety_pictures = etyDomElement.querySelector<HTMLDivElement>('.ety_pictures');
        if (!ety_pictures) {
            console.warn("Missing pictures");
        } else if (this.etymology.pictures) {
            this.etymology.pictures.slice(0, 5).forEach(
                img => ety_pictures.appendChild(imageToDomElement(img))
            );
        } else {
            ety_pictures.style.display = 'none';
        }

        const src_osm = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_osm');
        if (!src_osm) {
            console.warn("Missing .etymology_src_osm");
        } else if (this.etymology.from_osm_type && this.etymology.from_osm_id && src_osm) {
            const osmURL = `https://www.openstreetmap.org/${this.etymology.from_osm_type}/${this.etymology.from_osm_id}`;
            if (debug) console.info("Showing OSM etymology source", { ety: this.etymology, osmURL, src_osm });
            src_osm.href = osmURL;
            src_osm.classList.remove('hiddenElement');
        } else {
            src_osm.classList.add('hiddenElement');
        }

        const src_osm_plus_wd = etyDomElement.querySelector<HTMLAnchorElement>('.src_osm_plus_wd'),
            src_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_wd');
        if (!src_osm_plus_wd)
            console.warn("Missing .src_osm_plus_wd");
        else if (this.etymology.from_osm_type && this.etymology.from_osm_id && this.etymology.from_wikidata_entity)
            src_osm_plus_wd.classList.remove("hiddenElement");
        else
            src_osm_plus_wd.classList.add("hiddenElement");

        if (!src_wd) {
            console.warn("Missing .etymology_src_wd");
        } else if (this.etymology.from_wikidata_entity) {
            const wdURL = `https://www.wikidata.org/wiki/${this.etymology.from_wikidata_entity}#${this.etymology.from_wikidata_prop}`;
            if (debug) console.info("Showing WD etymology source", { ety: this.etymology, wdURL, src_wd });
            src_wd.href = wdURL;
            src_wd.classList.remove("hiddenElement");
        } else {
            src_wd.classList.add("hiddenElement");
        }

        const src_part_of_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_part_of_wd'),
            src_part_of_wd_wrapper = etyDomElement.querySelector<HTMLElement>('.etymology_src_part_of_wd_wrapper');
        if (!src_part_of_wd_wrapper) {
            console.warn("Missing etymology_src_part_of_wd_wrapper");
        } else if (this.etymology.from_parts_of_wikidata_cod && src_part_of_wd) {
            src_part_of_wd.href = `https://www.wikidata.org/wiki/${this.etymology.from_parts_of_wikidata_cod}#P527`;
            src_part_of_wd_wrapper.classList.remove("hiddenElement");
        } else {
            src_part_of_wd_wrapper.classList.add("hiddenElement");
        }

        const propagated = etyDomElement.querySelector<HTMLElement>('.etymology_propagated_wrapper');
        if (propagated && this.etymology.propagated) {
            propagated.classList.remove("hiddenElement");
        } else if (propagated) {
            propagated.classList.add("hiddenElement");
        }

        this.innerHTML = "";
        if (debug) console.info("EtymologyElement: rendering", { etyDomElement });
        this.appendChild(etyDomElement);
        this.classList.remove("hiddenElement");
    }
}

customElements.define("owmf-etymology", EtymologyElement, { extends: "div" });

export function etymologyToDomElement(ety: EtymologyDetails, currentZoom = 12.5): EtymologyElement {
    const etymologyElement = document.createElement("div", { is: "owmf-etymology" }) as EtymologyElement;
    etymologyElement.currentZoom = currentZoom;
    etymologyElement.etymology = ety;
    return etymologyElement;
}
