import { debugLog } from "./config";
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

    let imgUrl: string | null,
        imgPreviewUrl: string | null,
        imgAttribution: string | null,
        imgName: string | null;
    if (typeof img == 'object' && typeof img.picture == 'string') {
        imgName = decodeURIComponent(img.picture);
        imgPreviewUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + img.picture + '?width=400px';
        imgUrl = 'https://commons.wikimedia.org/wiki/File:' + img.picture;
        imgAttribution = img.attribution ? 'Image via ' + img.attribution : null;
        debugLog("imageToDomElement: object img", { img, imgUrl, imgPreviewUrl, imgAttribution });
    } else if (typeof img == 'string') {
        imgName = decodeURIComponent(img.replace("http://commons.wikimedia.org/wiki/Special:FilePath/", ""));
        imgPreviewUrl = img;
        imgUrl = img;
        imgAttribution = null;
        debugLog("imageToDomElement: string img", { img, imgUrl, imgPreviewUrl, imgAttribution });
    } else {
        imgName = null;
        imgPreviewUrl = null;
        imgUrl = null;
        imgAttribution = null;
        console.warn("imageToDomElement: bad img", { img });
    }

    if (imgUrl && imgPreviewUrl) {
        picture.className = 'pic-img';
        picture.alt = "Etymology picture via Wikimedia Commons";
        picture.src = imgPreviewUrl;
        // Link to thumbnail, example: "https://commons.wikimedia.org/wiki/Special:FilePath/Dal%20Monte%20Casoni.tif?width=400px"

        link.className = 'pic-link';
        link.title = "Etymology picture via Wikimedia Commons";
        link.href = imgUrl;
        // Link to original image page, example: "https://commons.wikimedia.org/wiki/File:Dal_Monte_Casoni.tif"
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
