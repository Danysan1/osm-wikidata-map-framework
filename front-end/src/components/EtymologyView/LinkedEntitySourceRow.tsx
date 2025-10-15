import { OSM_TITLE } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { LinkedEntity } from "@/src/model/LinkedEntity";
import Link from "next/link";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export const LinkedEntitySourceRow: FC<LinkedEntity> = ({
    from_osm_instance,
    from_osm_type,
    from_osm_id,
    osm_wd_join_field,
    propagated,
    from_wikidata_entity,
    from_wikidata_prop,
    from_parts_of_wikidata_cod,
    wikidata
}) => {
    const { t, i18n } = useTranslation(),
        { sourcePresetID } = useUrlFragmentContext(),
        fromOsm =
            osm_wd_join_field === "OSM" ||
            !!from_osm_instance ||
            !!propagated,
        osmFeatureUrl =
            fromOsm && from_osm_type && from_osm_id
                ? `${process.env.NEXT_PUBLIC_OWMF_osm_instance_url}/${from_osm_type}/${from_osm_id}`
                : null,
        fromWdUrl = from_wikidata_entity
            ? `${process.env.NEXT_PUBLIC_OWMF_wikibase_instance_url}/wiki/${from_wikidata_entity}`
            : null,
        wdFeatureUrl =
            osm_wd_join_field?.startsWith("P") && fromWdUrl
                ? `${fromWdUrl}#${osm_wd_join_field}`
                : null,
        showArrow = (!!osmFeatureUrl || !!wdFeatureUrl) && !!fromWdUrl,
        wdUrlPartOf = from_parts_of_wikidata_cod
            ? `${process.env.NEXT_PUBLIC_OWMF_wikibase_instance_url}/wiki/${from_parts_of_wikidata_cod}#P527`
            : null

    return <span className="etymology_src_wrapper">
        {t("etymology_details.source")}
        <wbr />
        &nbsp;
        {osmFeatureUrl && (
            <span className="etymology_src_osm_feature_wrapper">
                <a className="etymology_src_osm_feature" href={osmFeatureUrl}>
                    {OSM_TITLE}
                </a>
                &nbsp;
            </span>
        )}
        {wdFeatureUrl && (
            <span className="etymology_src_wd_feature_wrapper">
                <a className="etymology_src_wd_feature" href={wdFeatureUrl}>
                    wikidata.org
                </a>
                &nbsp;
            </span>
        )}
        {showArrow && <span className="src_osm_plus_wd">&gt;&nbsp;</span>}
        {fromWdUrl && (
            <span className="etymology_src_from_wd_wrapper">
                <a
                    className="etymology_src_from_wd"
                    href={`${fromWdUrl}#${from_wikidata_prop ?? ""}`}
                >
                    wikidata.org
                </a>
                &nbsp;
            </span>
        )}
        {propagated && (
            <span className="etymology_propagated_wrapper">
                &gt;&nbsp;
                <Link title={t("etymology_details.propagation")}
                    href={`/${i18n.language}/contributing/${sourcePresetID}#propagation`}>
                    {t("etymology_details.propagation")}
                </Link>
                &nbsp;
            </span>
        )}
        {wdUrlPartOf && (
            <span className="etymology_src_part_of_wd_wrapper">
                &gt;&nbsp;
                <a className="etymology_src_part_of_wd" href={wdUrlPartOf}>
                    wikidata.org
                </a>
                &nbsp;
            </span>
        )}
        {wikidata && (
            <span className="etymology_src_entity_wrapper">
                &gt;&nbsp;
                <a
                    className="etymology_src_entity"
                    href={`${process.env.NEXT_PUBLIC_OWMF_wikibase_instance_url}/wiki/${wikidata}`}
                >
                    wikidata.org
                </a>
            </span>
        )}
    </span>;
}