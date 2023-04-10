import { debugLog } from "./config";
import { loadTranslator } from "./i18n";
import { WikimediaCommonsService } from "./services/WikimediaCommonsService";

interface DetailedImage {
    picture: string,
    attribution?: string,
}

export type ImageResponse = string | DetailedImage;

export function imageToDomElement(img: ImageResponse): HTMLDivElement {
    const link = document.createElement('a'),
        picture = document.createElement('img'),
        attribution = document.createElement('p'),
        imgContainer = document.createElement('div');
    imgContainer.className = 'pic-container';

    let imgAttribution: string | null;
    /**
     * Standard name of the image, without the initial "File:"
     * 
     * @example Battle between Francisco Poras and Columbus on Jamaica (1).tif
     * (visible in https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif )
     */
    let imgName: string | null;
    if (typeof img == 'object' && typeof img.picture == 'string') {
        imgName = decodeURIComponent(img.picture);
        imgAttribution = img.attribution ? 'Image via ' + img.attribution : null;
        debugLog("imageToDomElement: object img", { img, imgAttribution });
    } else if (typeof img == 'string') {
        imgName = decodeURIComponent(img.replace(/^.*(Special:FilePath\/)|(File:)/, ""));
        imgAttribution = null;
        debugLog("imageToDomElement: string img", { img, imgAttribution });
    } else {
        imgName = null;
        imgAttribution = null;
        console.warn("imageToDomElement: bad img", { img });
    }

    if (imgName) {
        /**
         * UrlEncoded name
         * 
         * @example Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif
         */
        const encodedImg = encodeURIComponent(imgName);

        /**
         * Link to the lossy preview / thumbnail
         * 
         * @example https://commons.wikimedia.org/wiki/Special:FilePath/Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif?width=256px
         * (links to https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_%281%29.tif/lossy-page1-256px-Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_%281%29.tif.jpg )
         */
        const imgPreviewUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedImg}?width=256px`;

        /**
         * Link to original image page.
         * 
         * @example https://commons.wikimedia.org/wiki/File:Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif
         * (redirects to https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif )
         */
        const imgUrl = 'https://commons.wikimedia.org/wiki/File:' + encodedImg;

        picture.className = 'pic-img';
        picture.src = imgPreviewUrl;

        link.className = 'pic-link';
        link.href = imgUrl;

        loadTranslator().then(t => {
            picture.alt = t("feature_details.picture_via_commons");
            link.title = t("feature_details.picture_via_commons");
        });

        link.appendChild(picture);
        imgContainer.appendChild(link);

        if (imgAttribution) {
            attribution.className = 'pic-attr';
            attribution.innerHTML = imgAttribution;
            imgContainer.appendChild(attribution);
        } else if (imgName) {
            new WikimediaCommonsService().fetchAttribution(imgName)
                .then(res => {
                    attribution.className = 'pic-attr';
                    attribution.innerHTML = res;
                    imgContainer.appendChild(attribution);
                })
                .catch(console.warn);
        }
    } else {
        imgContainer.classList.add("hiddenElement");
    }

    return imgContainer;
}
