import { IControl } from 'maplibre-gl';

// import { IControl } from 'mapbox-gl';

import { debug, getJsonConfig } from '../config';

/**
 * Let the user choose the language.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
export class LanguageControl implements IControl {
    private _container?: HTMLElement;

    onAdd(): HTMLElement {
        const flags: Record<string, string> = { // https://commons.wikimedia.org/wiki/Category:SVG_sovereign_state_flags
            "en": "https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg",
            "fr": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Flag_of_France_%282020%E2%80%93present%29.svg",
            "de": "https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg",
            "it": "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg",
            "es": "https://upload.wikimedia.org/wikipedia/commons/8/89/Bandera_de_Espa%C3%B1a.svg",
        };
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl language-ctrl';

        const language = document.documentElement.lang.split('-').at(0),
            i18n_override = getJsonConfig("i18n_override");
        if (!language || typeof i18n_override !== "object") {
            console.warn("LanguageControl: Missing language or i18n_override");
            this._container.classList.add("hiddenElement");
            return this._container;
        }

        const languages = Object.keys(i18n_override);
        if (languages.length < 2) {
            this._container.classList.add("hiddenElement");
            return this._container;
        }

        const languageTable = document.createElement("table"),
            languageRow = document.createElement("tr");
        languageTable.className = "language-ctrl-table custom-ctrl-table";
        languages.forEach((lang) => {
            const cell = document.createElement("td"),
                link = document.createElement("a"),
                flagImg = document.createElement("img");
            flagImg.src = flags[lang];
            link.title = lang;
            link.className = "language-select-link language-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon hiddenElement";
            //link.addEventListener("click", () => window.location.search = "?lang=" + lang);
            link.href = "?lang=" + lang;
            cell.className = "content-cell";
            link.appendChild(flagImg);
            cell.appendChild(link);
            languageRow?.appendChild(cell);
        });
        languageTable.appendChild(languageRow);
        this._container.appendChild(languageTable);

        const languageCell = document.createElement("td"),
            languageButton = document.createElement("button");
        languageButton.innerText = "🔣";
        languageButton.className = "language-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon";
        languageButton.addEventListener("click", () => {
            if (debug) console.debug("LanguageControl: Toggling language selection links");
            languageRow.querySelectorAll(".language-select-link").forEach(btn => btn.classList.toggle("hiddenElement"));
        });
        languageCell.className = "button-cell";
        languageCell.appendChild(languageButton);
        languageRow.appendChild(languageCell);

        return this._container;
    }

    onRemove() {
        this._container?.remove();
        this._container = undefined;
    }
}