import { DatePrecision, EtymologyDetails } from "@/src/model/EtymologyDetails";
import { WikipediaService } from "@/src/services/WikipediaService";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { EtymologyButtonRow } from "../ButtonRow/EtymologyButtonRow";
import { CommonsImage } from "../ImageWithAttribution/CommonsImage";

interface EtymologyViewProps {
    etymology: EtymologyDetails;
}

export const EtymologyView: React.FC<EtymologyViewProps> = ({ etymology }) => {
    const { t, i18n } = useTranslation();

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
     */
    const formatDate = useCallback((date: Date | string | number, precision?: DatePrecision): string => {
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

        const out = dateObject.toLocaleDateString(i18n.language, options);
        //if (process.env.NODE_ENV === 'development') console.debug("formatDate", { date, precision, dateObject, options, out });
        return out;
    }, [i18n.language]);

    return (
        <div className="etymology">
            <div className="grid grid-auto">
                <div className="column">
                    <div className="header column etymology_header">
                        <h2 className="etymology_name">{etymology.name}</h2>
                        <h3 className="etymology_description">{etymology.description}</h3>
                    </div>
                    <div className="info column">
                        <EtymologyButtonRow etymology={etymology} />

                        <p className="wikipedia_extract"></p>
                        <p className="start_end_date"></p>
                        <p className="event_place"></p>
                        <p className="citizenship"></p>
                        <p className="gender"></p>
                        <p className="occupations"></p>
                        <p className="prizes"></p>
                    </div>
                </div>

                {etymology.pictures && <div className="etymology_pictures columns">
                    {etymology.pictures.map((img, i) => <CommonsImage key={i} name={img} />)}
                </div>}
            </div>
            <span className="etymology_src_wrapper">
                <span>{t("feature_details.source")}</span>
                <a className="etymology_src_osm hiddenElement" href="https://www.openstreetmap.org">OpenStreetMap</a>
                <span className="src_osm_plus_wd hiddenElement"> &gt; </span>
                <a className="etymology_src_wd hiddenElement" href="https://www.wikidata.org">Wikidata</a>
                <span className="etymology_propagated_wrapper hiddenElement">
                    &gt;
                    <a title={t("etymology_details.propagation")} href={process.env.owmf_propagation_docs_url}>
                        {t("etymology_details.propagation")}
                    </a>
                </span>
                <span className="etymology_src_part_of_wd_wrapper hiddenElement">
                    &gt;
                    <a className="etymology_src_part_of_wd">Wikidata</a>
                </span>
                &gt;
                <a className="etymology_src_entity" href="https://www.wikidata.org">Wikidata</a>
            </span>
            <div className="etymology_parts_container hiddenElement"></div>
        </div>
    );
};

/**
 * WebComponent to display an etymology
 */
export class EtymologyElement extends HTMLDivElement {
    private render() {


        const wikipedia_extract = etyDomElement.querySelector<HTMLElement>('.wikipedia_extract');
        if (!wikipedia_extract) {
            console.warn("Missing .wikipedia_extract");
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
            console.warn("Missing .start_end_date");
        } else if (!!this.etymology.birth_date || !!this.etymology.birth_place || !!this.etymology.death_date || this.etymology.death_place) {
            const birth_date = this.etymology.birth_date ? formatDate(this.etymology.birth_date, this.etymology.birth_date_precision) : "?",
                birth_place = this.etymology.birth_place ? this.etymology.birth_place : "?",
                death_date = this.etymology.death_date ? formatDate(this.etymology.death_date, this.etymology.death_date_precision) : "?",
                death_place = this.etymology.death_place ? this.etymology.death_place : "?";
            start_end_date.innerText = `📅 ${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
        } else if (!!this.etymology.start_date || this.etymology.end_date) {
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
            console.warn("Missing .event_place");
        } else if (this.etymology.event_place) {
            event_place.innerText = '📍 ' + this.etymology.event_place;
        } else {
            event_place.style.display = 'none';
        }

        const citizenship = etyDomElement.querySelector<HTMLElement>('.citizenship');
        if (!citizenship) {
            console.warn("Missing .citizenship");
        } else if (this.etymology.citizenship) {
            citizenship.innerText = '🌍 ' + this.etymology.citizenship;
        } else {
            citizenship.style.display = 'none';
        }

        const gender = etyDomElement.querySelector<HTMLElement>('.gender');
        if (!gender) {
            console.warn("Missing .gender");
        } else if (this.etymology.gender) {
            gender.innerText = '⚧️ ' + this.etymology.gender;
        } else {
            gender.style.display = 'none';
        }

        const occupations = etyDomElement.querySelector<HTMLElement>('.occupations');
        if (!occupations) {
            console.warn("Missing .occupations");
        } else if (this.etymology.occupations) {
            occupations.innerText = '🛠️ ' + this.etymology.occupations;
        } else {
            occupations.style.display = 'none';
        }

        const prizes = etyDomElement.querySelector<HTMLElement>('.prizes');
        if (!prizes) {
            console.warn("Missing .prizes");
        } else if (this.etymology.prizes) {
            prizes.innerText = '🏆 ' + this.etymology.prizes;
        } else {
            prizes.style.display = 'none';
        }

        const ety_pictures = etyDomElement.querySelector<HTMLDivElement>('.ety_pictures');
        if (!ety_pictures) {
            console.warn("Missing .pictures");
        } else if (this.etymology.pictures) {
            this.etymology.pictures.slice(0, 5).forEach(
                img => ety_pictures.appendChild(imageToDomElement(img)) // TODO <CommonsImage name={img} />
            );
        } else {
            ety_pictures.style.display = 'none';
        }

        const src_osm = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_osm'),
            src_osm_plus_wd = etyDomElement.querySelector<HTMLAnchorElement>('.src_osm_plus_wd'),
            src_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_wd'),
            showOsmJoinSource = (this.etymology.osm_wd_join_field === "OSM" || !!this.etymology.from_osm || this.etymology.propagated) && this.etymology.from_osm_type && this.etymology.from_osm_id && src_osm,
            showWdJoinSource = this.etymology.osm_wd_join_field && this.etymology.osm_wd_join_field !== "OSM" && this.etymology.from_wikidata_entity && src_wd;
        if (!src_osm) {
            console.warn("Missing .etymology_src_osm");
        } else if (showOsmJoinSource) {
            const osmURL = `https://www.openstreetmap.org/${this.etymology.from_osm_type}/${this.etymology.from_osm_id}`;
            if (process.env.NODE_ENV === 'development') console.debug("Showing OSM etymology source", { ety: this.etymology, osmURL, src_osm });
            src_osm.innerText = "OpenStreetMap";
            src_osm.href = osmURL;
            src_osm.classList.remove('hiddenElement');
        } else if (showWdJoinSource) {
            const wdURL = `https://www.wikidata.org/wiki/${this.etymology.from_wikidata_entity}#${this.etymology.osm_wd_join_field}`;
            src_osm.innerText = "Wikidata";
            src_osm.href = wdURL;
            src_osm.classList.remove('hiddenElement');
        } else {
            src_osm.classList.add('hiddenElement');
        }

        if (!src_osm_plus_wd)
            console.warn("Missing .src_osm_plus_wd");
        else if ((!!showOsmJoinSource || showWdJoinSource) && this.etymology.from_wikidata_entity)
            src_osm_plus_wd.classList.remove("hiddenElement");
        else
            src_osm_plus_wd.classList.add("hiddenElement");

        if (!src_wd) {
            console.warn("Missing .etymology_src_wd");
        } else if (this.etymology.from_wikidata_entity) {
            const wdURL = `https://www.wikidata.org/wiki/${this.etymology.from_wikidata_entity}#${this.etymology.from_wikidata_prop ?? ""}`;
            if (process.env.NODE_ENV === 'development') console.debug("Showing WD etymology source", { ety: this.etymology, wdURL, src_wd });
            src_wd.href = wdURL;
            src_wd.classList.remove("hiddenElement");
        } else {
            src_wd.classList.add("hiddenElement");
        }

        const src_part_of_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_part_of_wd'),
            src_part_of_wd_wrapper = etyDomElement.querySelector<HTMLElement>('.etymology_src_part_of_wd_wrapper');
        if (!src_part_of_wd_wrapper) {
            console.warn("Missing .etymology_src_part_of_wd_wrapper");
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

        const src_entity = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_entity');
        if (!src_entity) {
            console.warn("Missing .etymology_src_entity");
        } else if (this.etymology.wikidata) {
            const wdURL = `https://www.wikidata.org/wiki/${this.etymology.wikidata}`;
            if (process.env.NODE_ENV === 'development') console.debug("Showing WD etymology entity source", { ety: this.etymology, wdURL, src_entity });
            src_entity.href = wdURL;
            src_entity.classList.remove("hiddenElement");
        } else {
            src_entity.classList.add("hiddenElement");
        }

        const etymology_parts_container = etyDomElement.querySelector<HTMLDivElement>('.etymology_parts_container');
        if (!etymology_parts_container) {
            console.warn("Missing .etymology_parts_container");
        } else {
            etymology_parts_container.dataset.wikidataCod = this.etymology.wikidata;
            etymology_parts_container.classList.add("hiddenElement");
        }

        this.innerHTML = "";
        // if (process.env.NODE_ENV === 'development') console.debug("EtymologyElement: rendering", { etyDomElement });
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
