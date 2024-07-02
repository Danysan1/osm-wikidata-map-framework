const defaultIcon = "img/Translation_-_Noun_project_987.svg",
    flags: Record<string, string> = { // https://commons.wikimedia.org/wiki/Category:SVG_sovereign_state_flags
        "en": "./English_language.svg",
        "fr": "./Flag_of_France.svg",
        "de": "./Flag_of_Germany.svg",
        "it": "./Flag_of_Italy.svg",
        "es": "./Flag_of_Spain.svg",
        "da": "./Flag_of_Denmark.svg",
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
            // if (process.env.NODE_ENV === 'development') console.debug("LanguageFlagElement: unsetting language");
        } else {
            this._language = language;
            // if (process.env.NODE_ENV === 'development') console.debug("LanguageFlagElement: setting language", { language, _language: this._language });
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
