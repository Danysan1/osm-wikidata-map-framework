import type { Map } from 'maplibre-gl';
import { debug } from '../config';
import { translateAnchorTitle, translateContent } from '../i18n';
import { DropdownControl, DropdownItem } from './DropdownControl';

/**
 * Let the user choose the language.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
export class LanguageControl extends DropdownControl {
    constructor() {
        const lang = document.documentElement.lang.split('-').at(0),
            items = [
                { id: "da", text: "Dansk" },
                { id: "de", text: "Deutsch" },
                { id: "en", text: "English" },
                { id: "es", text: "Español" },
                { id: "fr", text: "Français" },
                { id: "it", text: "Italiano" },
            ].map((x): DropdownItem => ({
                id: x.id,
                text: x.text,
                onSelect: () => {
                    if (debug) console.debug("LanguageControl: Changing language to " + x.id);
                    window.location.search = "?lang=" + x.id;
                }
            }));

        super(
            '🔣',
            items,
            lang || "en",
            "change_language"
        )
    }

    onAdd(map: Map) {
        const out = super.onAdd(map);

        const table = this.getContainer()?.querySelector<HTMLTableElement>("table");
        if (!table)
            throw new Error("Missing container");

        const tr = document.createElement("tr");
        table.appendChild(tr);

        const td = document.createElement("td");
        tr.appendChild(td);

        const translateLink = document.createElement("a");
        translateLink.href = "https://app.transifex.com/osm-wikidata-maps/osm-wikidata-map-framework/dashboard/";
        translateLink.target = "_blank";
        translateLink.rel = "noopener noreferrer";
        translateLink.role = "button";
        translateLink.className = "hiddenElement k-button w3-button w3-white w3-border w3-round-large button-6 translate_button";
        td.appendChild(translateLink);
        translateAnchorTitle(td, ".translate_button", "translate", "Translate");

        const img = document.createElement("span"),
            text = document.createElement("span");
        img.className = "button_img";
        img.innerHTML = "🔣 &nbsp;";
        translateLink.appendChild(img);
        text.className = "i18n_translate";
        translateLink.appendChild(text);
        translateContent(td, ".i18n_translate", "translate", "Translate");

        return out;
    }

    protected showDropdown(show?: boolean): void {
        super.showDropdown(show);

        const translateLink = this.getContainer()?.querySelector(".translate_button");
        if (!translateLink)
            throw new Error("Missing translate link");

        if (show)
            translateLink.classList.remove("hiddenElement");
        else
            translateLink.classList.add("hiddenElement");
    }
}