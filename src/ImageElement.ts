import { debugLog } from "./config";

interface DetailedImage {
    picture: string,
    attribution?: string,
}

type ImageResponse = string | DetailedImage;

function imageToDomElement(img: ImageResponse): HTMLDivElement {
    const link = document.createElement('a'),
        picture = document.createElement('img'),
        attribution = document.createElement('p'),
        imgContainer = document.createElement('div');

    let imgUrl, imgPreviewUrl, imgAttribution;
    if (typeof img == 'object' && typeof img.picture == 'string') {
        imgPreviewUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + img.picture + '?width=400px';
        imgUrl = 'https://commons.wikimedia.org/wiki/File:' + img.picture;
        imgAttribution = img.attribution ? 'Image via ' + img.attribution : null;
        debugLog("imageToDomElement: object img", { img, imgUrl, imgPreviewUrl, imgAttribution });
    } else if (typeof img == 'string') {
        imgPreviewUrl = img;
        imgUrl = img;
        imgAttribution = null;
        debugLog("imageToDomElement: string img", { img, imgUrl, imgPreviewUrl, imgAttribution });
    } else {
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
        }

        imgContainer.className = 'pic-container';
    } else {
        imgContainer.style.display = 'none';
    }

    return imgContainer;
}

export { ImageResponse, imageToDomElement }
