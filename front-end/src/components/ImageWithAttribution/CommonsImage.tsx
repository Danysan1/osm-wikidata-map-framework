import { ImageWithAttribution } from "./ImageWithAttribution";
import { useEffect, useState } from "react";
import { WikimediaCommonsService } from "@/src/services/WikimediaCommonsService";

interface CommonsImageProps {
    /**
     * Standard name of the image
     * 
     * @example "Battle between Francisco Poras and Columbus on Jamaica (1).tif"
     * @example "File:Battle between Francisco Poras and Columbus on Jamaica (1).tif"
     * @example https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif
     */
    name: string;
    className?:string;
}

/**
 * Display a Wikimedia Commons image and its attribution
 */
export const CommonsImage: React.FC<CommonsImageProps> = ({ name, className }) => {
    const decodedImg = decodeURIComponent(name.replace(/^.*(Special:FilePath\/)|(File:)/, ""));

    /**
     * UrlEncoded name
     * 
     * @example "Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif"
     */
    const encodedImg = encodeURIComponent(decodedImg);

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

    const [attribution, setAttribution] = useState<string>();
    useEffect(() => {
        new WikimediaCommonsService().fetchAttribution(name).then(setAttribution).catch(console.error);
    }, [name]);

    return decodedImg && <ImageWithAttribution previewUrl={imgPreviewUrl} originalUrl={imgUrl} attribution={attribution} className={className} />;
}

