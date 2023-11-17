const defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/0/02/Translation_-_Noun_project_987.svg",
    flags: Record<string, string> = { // https://commons.wikimedia.org/wiki/Category:SVG_sovereign_state_flags
        "en": "https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg",
        "fr": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Flag_of_France_%282020%E2%80%93present%29.svg",
        "de": "https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg",
        "it": "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg",
        "es": "https://upload.wikimedia.org/wikipedia/commons/8/89/Bandera_de_Espa%C3%B1a.svg",
        "da": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg",
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
            this._language = decodeURIComponent(language.replace(/^.*(Special:FilePath\/)|(File:)/, ""));
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
