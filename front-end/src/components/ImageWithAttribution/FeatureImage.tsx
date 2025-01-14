import { getPropTags, OwmfFeatureProperties } from "@/src/model/OwmfFeatureProperties";
import { WikidataStatementService } from "@/src/services/WikidataStatementService";
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
    panoramaxUUID = tags.panoramax
      ? PANORAMAX_UUID_REGEX.exec(tags.panoramax)?.[0]
      : undefined;

  const [commons, setCommons] = useState<string[]>();
  useEffect(() => {
    if (feature.commons?.includes("File:")) {
      setCommons([feature.commons]);
    } else if (feature.picture?.includes("File:")) {
      setCommons([feature.picture]);
    } else if (feature.wikidata) {
      const statementService = new WikidataStatementService();
      statementService
        .getCommonsImageFromWikidataID(feature.wikidata)
        .then((image) => {
          if (image) {
            console.debug("Found image from Wikidata", { feature, image });
            setCommons([image]);
          }
        })
        .catch(() => {
          console.warn("Failed getting image from Wikidata", feature);
        });
    }
  }, [feature]);

  return (
    (!!commons || !!panoramaxUUID) && (
      <div className={className}>
        {commons?.map((img, i) => (
          <CommonsImage key={i} name={img} />
        ))}
        {panoramaxUUID && <PanoramaxImage uuid={panoramaxUUID} />}
        {feature.iiif_url && <IIIFImages manifestURL={feature.iiif_url} />}
      </div>
    )
  );
};
