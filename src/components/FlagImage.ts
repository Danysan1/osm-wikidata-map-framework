const defaultIcon = "img/Translation_-_Noun_project_987.svg",
    flags: Record<string, string> = { // https://commons.wikimedia.org/wiki/Category:SVG_sovereign_state_flags
        "en": "img/English_language.svg",
        "fr": "img/Flag_of_France_%282020%E2%80%93present%29.svg",
        "de": "img/Flag_of_Germany.svg",
        "it": "img/Flag_of_Italy.svg",
        "es": "img/Bandera_de_Espa%C3%B1a.svg",
        "da": "img/Flag_of_Denmark.svg",
    };

/**
 * WebComponent to display a language image for a language
 */
export class LanguageFlagElement extends HTMLImageElement {
    private _language?: string;

    constructor() {
        super();
        this.classList.add('pic-container', 'hiddenElement', 'custom-component');
    }

    get language(): string | undefined {
        return this._language;
    }

    set language(language: string | undefined) {
        if (!language) {
            this._language = undefined;
            // if (debug) console.info("LanguageFlagElement: unsetting language");
        } else {
            this._language = language;
            // if (debug) console.info("LanguageFlagElement: setting language", { language, _language: this._language });
        }
        this.render();
    }

    private render() {
        if (!this._language) {
            this.classList.add("hiddenElement");
            this.innerHTML = "";
            return;
        }

        this.src = this._language in flags ? flags[this._language] : defaultIcon;
        this.alt = this._language;
        this.loading = "lazy";
        this.width = 23;
        this.height = 15;
        this.classList.remove("hiddenElement");
    }
}

customElements.define("owmf-language-flag", LanguageFlagElement, { extends: "img" });

export function languageToDomElement(language: string): LanguageFlagElement {
    const flagElement = document.createElement("img", { is: "owmf-language-flag" }) as LanguageFlagElement;
    flagElement.language = language;
    return flagElement;
}
