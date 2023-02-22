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
            fetchWikimediaCommonsAttribution(imgName)
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

/**
 * @see https://commons.wikimedia.org/wiki/Commons:Credit_line#Automatic_handling_of_attribution_by_reusers
 * @see https://commons.wikimedia.org/w/api.php?action=help&modules=main
 * @see https://www.mediawiki.org/wiki/API:Main_page
 * @see https://www.mediawiki.org/wiki/API:Cross-site_requests
 * @see https://www.mediawiki.org/wiki/Manual:CORS#Using_jQuery_methods
 * @param imgName File name from Wikimedia Commons (NON URLencoded, withouth the initial "File:")
 * @returns The attribution text for the file (includes license and author)
 */
async function fetchWikimediaCommonsAttribution(imgName: string): Promise<string> {
    const attributionApiUrl = "https://commons.wikimedia.org/w/api.php?" + (new URLSearchParams({
        action: "query",
        prop: "imageinfo",
        iiprop: "extmetadata",
        iiextmetadatafilter: "Artist|LicenseShortName",
        format: "json",
        titles: "File:" + imgName,
        origin: '*',
    })).toString();
    return fetch(attributionApiUrl)
        .then(response => {
            if (response.status == 200)
                return response.json();
            else
                throw new Error("The request for the Wikimedia Commons attribution failed with code " + response.status);
        })
        .then(res => {
            const pages = res.query.pages,
                pageID = Object.keys(pages)[0],
                extmetadata = pages[pageID].imageinfo[0].extmetadata,
                license = extmetadata?.LicenseShortName?.value,
                artist = extmetadata?.Artist?.value;
            let imgAttribution = "Wikimedia Commons";
            if (typeof license === "string")
                imgAttribution += ", " + license;
            if (typeof artist === "string")
                imgAttribution += "<br />" + artist.replace(/<span style="display: none;">.*<\/span>/, "");
            return imgAttribution;
        });
}

export { ImageResponse, imageToDomElement }
