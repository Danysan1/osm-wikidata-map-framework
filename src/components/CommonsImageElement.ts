import { loadTranslator } from "../i18n";
import { WikimediaCommonsService } from "../services/WikimediaCommonsService";

/**
 * WebComponent to display a Wikimedia Commons image and its attribution
 */
export class CommonsImageElement extends HTMLDivElement {
    private _name?: string;

    constructor() {
        super();
        this.classList.add('pic-container', 'hiddenElement', 'custom-component');
    }

    /**
     * Standard name of the image, without the initial "File:"
     * 
     * @example "Battle between Francisco Poras and Columbus on Jamaica (1).tif"
     * (visible in https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif )
     */
    get name(): string | undefined {
        return this._name;
    }

    set name(name: string | undefined) {
        if (!name) {
            this._name = undefined;
            // if (process.env.NODE_ENV === 'development') console.debug("CommonsImageElement: unsetting name");
        } else {
            this._name = decodeURIComponent(name.replace(/^.*(Special:FilePath\/)|(File:)/, ""));
            // if (process.env.NODE_ENV === 'development') console.debug("CommonsImageElement: setting name", { name, _name: this._name });
        }
        this.render();
    }

    private render() {
        if (!this.name) {
            this.classList.add("hiddenElement");
            this.innerHTML = "";
            return;
        }

        /**
         * UrlEncoded name
         * 
         * @example "Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif"
         */
        const encodedImg = encodeURIComponent(this.name);

        /**
         * Link to the lossy preview / thumbnail
         * 
         * @example "https://commons.wikimedia.org/wiki/Special:FilePath/Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif?width=300px"
         * (links to https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_%281%29.tif/lossy-page1-300px-Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_%281%29.tif.jpg )
         */
        const imgPreviewUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedImg}?width=300px`;

        /**
         * Link to original image page.
         * 
         * @example "https://commons.wikimedia.org/wiki/File:Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif"
         * (redirects to https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif )
         */
        const imgUrl = 'https://commons.wikimedia.org/wiki/File:' + encodedImg;

        const picture = document.createElement('img');
        picture.className = 'pic-img';
        picture.src = imgPreviewUrl;

        const link = document.createElement('a');
        link.className = 'pic-link';
        link.href = imgUrl;
        link.appendChild(picture);

        this.innerHTML = "";
        this.appendChild(link);
        this.classList.remove("hiddenElement");

        loadTranslator().then(t => {
            const title = t("feature_details.picture_via_commons", "Picture from Wikimedia Commons");
            picture.alt = title;
            link.title = title;
            link.ariaLabel = title;
        }).catch(console.error);

        new WikimediaCommonsService()
            .fetchAttribution(this.name)
            .then(res => {
                const attribution = document.createElement('p');
                attribution.className = 'pic-attr';
                attribution.innerHTML = res;
                this.appendChild(attribution);
            })
            .catch(console.warn);

    }
}

customElements.define("owmf-commons-image", CommonsImageElement, { extends: "div" });

export function imageToDomElement(name: string): CommonsImageElement {
    const pictureElement = document.createElement("div", { is: "owmf-commons-image" }) as CommonsImageElement;
    pictureElement.name = name;
    return pictureElement;
}
