import { OsmInstance } from "@/src/model/Etymology";
import { OwmfFeatureProperties } from "@/src/model/OwmfFeatureProperties";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const FeatureSourceRow: FC<OwmfFeatureProperties> = ({
    from_wikidata,
    from_wikidata_entity,
    from_wikidata_prop,
    from_osm_instance,
    ohm_type,
    ohm_id,
    osm_type,
    osm_id,
    wikidata
}) => {
    const { t } = useTranslation();
    const fromOsmType = from_osm_instance === OsmInstance.OpenHistoricalMap ? ohm_type : osm_type,
        fromOsmId = from_osm_instance === OsmInstance.OpenHistoricalMap ? ohm_id : osm_id,
        fromOsmUrl =
            from_osm_instance && fromOsmType && fromOsmId
                ? `https://www.${from_osm_instance}/${fromOsmType}/${fromOsmId}`
                : undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdEntity = from_wikidata_entity || wikidata,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdProperty = from_wikidata_prop || "P625",
        fromWikidataUrl =
            from_wikidata && fromWdEntity
                ? `https://www.wikidata.org/wiki/${fromWdEntity}#${fromWdProperty}`
                : undefined;

    return <div className="feature_src_wrapper">
        {t("feature_details.source")}&nbsp;
        {fromOsmUrl && (
            <a className="feature_src_osm" href={fromOsmUrl}>
                {from_osm_instance}
            </a>
        )}
        {fromOsmUrl && fromWikidataUrl && (
            <span className="src_osm_and_wd">&nbsp;&&nbsp;</span>
        )}
        {fromWikidataUrl && (
            <a className="feature_src_wd" href={fromWikidataUrl}>
                wikidata.org
            </a>
        )}
    </div>;
}