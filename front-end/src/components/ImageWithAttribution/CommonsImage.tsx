import { WikimediaCommonsService } from "@/src/services/WikimediaCommonsService";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageWithAttribution } from "./ImageWithAttribution";

interface CommonsImageProps {
  /**
   * Name or URL of a Commons image
   *
   * @example "Battle between Francisco Poras and Columbus on Jamaica (1).tif" => unchanged
   * @example "File:Battle between Francisco Poras and Columbus on Jamaica (1).tif" => "Battle between Francisco Poras and Columbus on Jamaica (1).tif"
   * @example "https://commons.wikimedia.org/wiki/Special:FilePath/Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif?width=300px" => "Battle between Francisco Poras and Columbus on Jamaica (1).tif"
   * @example "https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif" => "Battle between Francisco Poras and Columbus on Jamaica (1).tif"
   * @example "https://upload.wikimedia.org/wikipedia/commons/c/c1/B%C3%A4ckerstra%C3%9Fe_8_Potsdam.jpg" => "Bäckerstraße_8_Potsdam.jpg"
   */
  name: string;
  className?: string;
}

const PREFIX_REGEX = /^.*((Special:FilePath\/)|(File:)|(commons\/\w\/\w\w\/))/,
  SUFFIX_REGEX = /[;?].*$/;

/**
 * Display a Wikimedia Commons image and its attribution
 */
export const CommonsImage: FC<CommonsImageProps> = ({ name, className }) => {
  const { t } = useTranslation(),
    title = t("feature_details.picture_via_commons", "Picture from Wikimedia Commons"),
    decodedImg = decodeURIComponent(
      name.replace(PREFIX_REGEX, "").replace(SUFFIX_REGEX, "")
    );

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
  const imgPreviewUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedImg}?width=350px`;

  /**
   * Link to original image page.
   *
   * @example "https://commons.wikimedia.org/wiki/File:Battle%20between%20Francisco%20Poras%20and%20Columbus%20on%20Jamaica%20(1).tif"
   * (redirects to https://commons.wikimedia.org/wiki/File:Battle_between_Francisco_Poras_and_Columbus_on_Jamaica_(1).tif )
   */
  const imgUrl = "https://commons.wikimedia.org/wiki/File:" + encodedImg;

  const [attribution, setAttribution] = useState<string>();
  useEffect(() => {
    new WikimediaCommonsService()
      .fetchAttribution(decodedImg)
      .then(setAttribution)
      .catch(console.error);
  }, [decodedImg]);

  console.debug("CommonsImage: ", { name, decodedImg, imgUrl, imgPreviewUrl, attribution });

  return (
    decodedImg && (
      <ImageWithAttribution
        previewUrl={imgPreviewUrl}
        originalUrl={imgUrl}
        attribution={attribution}
        title={title}
        className={className}
      />
    )
  );
};
