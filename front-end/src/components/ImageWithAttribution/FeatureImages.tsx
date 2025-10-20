import { getPropTags, OwmfFeatureProperties } from "@/src/model/OwmfFeatureProperties";
import { WikidataStatementService } from "@/src/services/WikidataStatementService";
import {
  COMMONS_FILE_REGEX,
  WikimediaCommonsService
} from "@/src/services/WikimediaCommonsService";
import { FC, useEffect, useState } from "react";
import { IIIFImages } from "../IIIFImages/IIIFImages";
import { CommonsImage } from "./CommonsImage";
import { PanoramaxImage } from "./PanoramaxImage";

const PANORAMAX_UUID_REGEX = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/;

interface FeatureImagesProps {
  feature: OwmfFeatureProperties;
  className?: string;
}

export const FeatureImages: FC<FeatureImagesProps> = ({ feature, className }) => {
  const tags = getPropTags(feature),
    panoramaxUUID = tags?.panoramax
      ? PANORAMAX_UUID_REGEX.exec(tags.panoramax)?.[0]
      : undefined;

  const [commons, setCommons] = useState<string>();
  useEffect(() => {
    const findImageFromCommonsCategory = () => {
      if (feature.commons) {
        new WikimediaCommonsService()
          .getFilesInCategory(feature.commons, 1)
          .then((files) => {
            if (files.length) setCommons(files[0]);
          })
          .catch(() => {
            console.warn("FeatureImages: Failed getting files from Commons category", feature.commons);
          });
      } else {
        console.debug("FeatureImages: No Commons image available", { wd: feature.wikidata, commons: feature.commons });
      }
    }

    if (feature.commons && COMMONS_FILE_REGEX.test(feature.commons)) {
      console.debug("FeatureImages: Found Commons image in commons", feature);
      setCommons(feature.commons);
    } else if (feature.picture && COMMONS_FILE_REGEX.test(feature.picture)) {
      console.debug("FeatureImages: Found Commons image in picture", feature);
      setCommons(feature.picture);
    } else if (feature.wikidata) {
      const statementService = new WikidataStatementService();
      statementService
        .getCommonsImageFromWikidataID(feature.wikidata)
        .then((image) => {
          if (image) {
            console.debug("FeatureImages: Found image from Wikidata", { feature, image });
            setCommons(image);
          } else {
            console.debug("FeatureImages: No Commons image found from Wikidata", feature.wikidata);
            findImageFromCommonsCategory();
          }
        })
        .catch(() => {
          console.warn("FeatureImages: Failed getting image from Wikidata", feature);
          findImageFromCommonsCategory();
        });
    } else {
      findImageFromCommonsCategory();
    }
  }, [feature]);

  return (
    (!!commons || !!panoramaxUUID || !!feature.iiif_url) && (
      <div className={className}>
        {commons && <CommonsImage name={commons} />}
        {panoramaxUUID && <PanoramaxImage uuid={panoramaxUUID} />}
        {feature.iiif_url && <IIIFImages manifestURL={feature.iiif_url} />}
      </div>
    )
  );
};
