import { PanoramaxService } from "@/src/services/PanoramaxService";
import { FC, useEffect, useState } from "react";
import { ImageWithAttribution } from "./ImageWithAttribution";

interface PanoramaxImageProps {
  /**
   * UUID of the Panoramax image
   *
   * @link https://wiki.openstreetmap.org/wiki/Key:panoramax
   * @example "cafb0ec8-51dd-43ac-836c-8cd1f7cb8725"
   */
  uuid: string;
  className?: string;
}

/**
 * Display a Panoramax image and its attribution
 * 
 * @link https://wiki.openstreetmap.org/wiki/Panoramax
 * @link https://wiki.openstreetmap.org/wiki/Key:panoramax
 * @link https://docs.panoramax.fr/
 */
export const PanoramaxImage: FC<PanoramaxImageProps> = ({ uuid, className }) => {
  /**
   * Link to the lossy preview / thumbnail
   *
   * @example "https://api.panoramax.xyz/api/pictures/cafb0ec8-51dd-43ac-836c-8cd1f7cb8725/thumb.jpg"
   */
  const imgPreviewUrl = `https://api.panoramax.xyz/api/pictures/${uuid}/thumb.jpg`;

  /**
   * Link to original image page.
   *
   * @example "https://api.panoramax.xyz/#focus=pic&pic=cafb0ec8-51dd-43ac-836c-8cd1f7cb8725"
   */
  const imgUrl = `https://api.panoramax.xyz/#focus=pic&pic=${uuid}`;

  const [attribution, setAttribution] = useState<string>();
  useEffect(() => {
    new PanoramaxService().fetchAttribution(uuid).then(setAttribution).catch(console.error);
  }, [uuid]);

  return (
    uuid && (
      <ImageWithAttribution
        previewUrl={imgPreviewUrl}
        originalUrl={imgUrl}
        attribution={attribution}
        title="Picture from Panoramax"
        className={className}
      />
    )
  );
};
