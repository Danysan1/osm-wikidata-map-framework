import { OSM_TITLE } from "@/src/config";
import { OwmfFeatureProperties } from "@/src/model/OwmfFeatureProperties";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const FeatureSourceRow: FC<OwmfFeatureProperties> = ({
    from_wikidata,
    from_wikidata_entity,
    from_wikidata_prop,
    from_osm_instance,
    osm_type,
    osm_id,
    wikidata
}) => {
    const { t } = useTranslation();
    const fromOsmUrl =
        from_osm_instance && osm_type && osm_id
            ? `${process.env.NEXT_PUBLIC_OWMF_osm_instance_url}/${osm_type}/${osm_id}`
            : undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdEntity = from_wikidata_entity || wikidata,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdProperty = from_wikidata_prop || "P625",
        fromWikidataUrl =
            from_wikidata && fromWdEntity
                ? `${process.env.NEXT_PUBLIC_OWMF_wikibase_instance_url}/wiki/${fromWdEntity}#${fromWdProperty}`
                : undefined;

    return <div className="feature_src_wrapper">
        {t("feature_details.source")}&nbsp;
        {fromOsmUrl && (
            <a className="feature_src_osm" href={fromOsmUrl}>
                {OSM_TITLE}
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