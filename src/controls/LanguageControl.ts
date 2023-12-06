import { IControl } from 'maplibre-gl';

// import { IControl } from 'mapbox-gl';

import { debug, getJsonConfig } from '../config';
import { loadTranslator } from '../i18n';
import { languageToDomElement } from '../components/FlagImage';

/**
 * Let the user choose the language.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
export class LanguageControl implements IControl {
    private container?: HTMLElement;

    onAdd(): HTMLElement {

        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl language-ctrl';
        this.container.ariaHidden = "true";

        const language = document.documentElement.lang.split('-').at(0),
            i18n_override = getJsonConfig("i18n_override");
        if (!language || typeof i18n_override !== "object") {
            console.warn("LanguageControl: Missing language or i18n_override");
            this.container.classList.add("hiddenElement");
            return this.container;
        }

        const languages = Object.keys(i18n_override);
        if (languages.length < 2) {
            this.container.classList.add("hiddenElement");
            return this.container;
        }

        const languageTable = document.createElement("table"),
            languageRow = document.createElement("tr"),
            translateCell = document.createElement("td"),
            translateLink = document.createElement("a");
        languageTable.ariaHidden = "true";
        languageRow.ariaHidden = "true";

        translateLink.title = "Translate";
        translateLink.ariaLabel = "Translate";
        translateLink.href = "https://app.transifex.com/osm-wikidata-maps/osm-wikidata-map-framework/dashboard/";
        translateLink.target = "_blank";
        translateLink.className = "language-select-link language-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon hiddenElement";
        translateLink.appendChild(languageToDomElement("Translate"));

        translateCell.className = "content-cell";
        translateCell.ariaHidden = "true";
        translateCell.appendChild(translateLink);
        languageRow.appendChild(translateCell);

        languages.filter(lang => lang !== language).forEach((lang) => {
            const cell = document.createElement("td"),
                link = document.createElement("button"),
                flagImg = languageToDomElement(lang);
            link.title = lang;
            link.ariaLabel = lang;
            link.className = "language-select-link language-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon hiddenElement";
            link.addEventListener("click", () => window.location.search = "?lang=" + lang);
            //link.href = "?lang=" + lang;
            cell.className = "content-cell";
            cell.ariaHidden = "true";
            link.appendChild(flagImg);
            cell.appendChild(link);
            languageRow?.appendChild(cell);
        });

        languageTable.className = "language-ctrl-table custom-ctrl-table";
        languageTable.appendChild(languageRow);

        this.container.appendChild(languageTable);

        const languageCell = document.createElement("td"),
            languageButton = document.createElement("button");
        languageButton.appendChild(languageToDomElement(language));
        loadTranslator().then(t => {
            const title = t("change_language", "Change language");
            languageButton.title = title;
            languageButton.ariaLabel = title;
        });
        languageButton.className = "language-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon";
        languageButton.addEventListener("click", () => {
            if (debug) console.debug("LanguageControl: Toggling language selection links");
            languageRow.querySelectorAll(".language-select-link").forEach(btn => btn.classList.toggle("hiddenElement"));
        });
        languageCell.className = "button-cell";
        languageCell.appendChild(languageButton);
        languageRow.appendChild(languageCell);

        return this.container;
    }

    onRemove() {
        this.container?.remove();
        this.container = undefined;
    }
}