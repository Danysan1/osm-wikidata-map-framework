import type { Map } from 'maplibre-gl';
import { getJsonConfig } from '../config';
import { getLanguage, translateAnchorTitle, translateContent } from '../i18n';
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
        const currentLanguage = getLanguage(),
            i18n_override: unknown = getJsonConfig("i18n_override");
        if (!i18n_override || typeof i18n_override !== "object")
            throw new Error("i18n_override is not configured, no languages available");

        const languages = Object.keys(i18n_override),
            selectedLanguage = languages.includes(currentLanguage) ? currentLanguage : 'en',
            languageNames: Record<string, string> = {
                da: "Dansk",
                de: "Deutsch",
                en: "English",
                es: "Español",
                fr: "Français",
                it: "Italiano",
            },
            items = languages.map((lang): DropdownItem => ({
                id: lang,
                text: lang in languageNames ? languageNames[lang] : lang,
                onSelect: () => {
                    if (process.env.NODE_ENV === 'development') console.warn("LanguageControl: Changing language to " + lang);
                    window.location.search = "?lang=" + lang;
                }
            }));

        super(
            '🔣',
            items,
            selectedLanguage,
            "change_language"
        )

        if (languages.length < 2)
            this.show(false);
    }

    override onAdd(map: Map) {
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

    override showDropdown(show?: boolean): void {
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