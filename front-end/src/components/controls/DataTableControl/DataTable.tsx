import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { WikidataDetailsService } from "@/src/services/WikidataDetailsService";
import { getEtymologies } from "@/src/services/etymologyUtils";
import { useTranslation } from "next-i18next";
import { FC, useEffect, useMemo, useState } from "react";
import { FeatureButtonRow } from "../../ButtonRow/FeatureButtonRow";

interface DataTableProps {
    features: EtymologyFeature[];
}

export const DataTable: FC<DataTableProps> = ({ features }) => {
    const { t } = useTranslation(),
        [etymologyDetails, setEtymologyDetails] = useState<Record<string, EtymologyDetails>>();

    useEffect(() => {
        const wikidataIdArray = features.flatMap(f => getEtymologies(f)?.filter(e => e.wikidata)?.map(e => e.wikidata!) ?? []),
            wikidataIdSet = new Set<string>(wikidataIdArray),
            detailsService = new WikidataDetailsService();
        detailsService.fetchEtymologyDetails(wikidataIdSet).then(
            (details) => setEtymologyDetails(details)
        ).catch(
            (e) => console.error("Error fetching etymology details", e)
        );
    }, [features]);

    return <table className="owmf_data_table">
        <thead>
            <tr>
                <th>{t("data_table.names")}</th>
                <th>{t("data_table.actions")}</th>
                <th>{t("data_table.linked_entities")}</th>
            </tr>
        </thead>
        <tbody>{features.map(
            f => <DataTableRow key={f.id} feature={f} details={etymologyDetails} />
        )}</tbody>
    </table>;
}

interface DataTableRowProps {
    feature: EtymologyFeature;
    details?: Record<string, EtymologyDetails>;
}

const DataTableRow: FC<DataTableRowProps> = ({ feature, details }) => {
    const { i18n } = useTranslation(),
        etys = getEtymologies(feature),
        etyCellContent = etys?.length ? <ul>
            {etys?.map(ety => <li key={ety.wikidata}>
                <a href={`https://www.wikidata.org/wiki/${ety.wikidata}`} target="_blank" rel="noreferrer">
                    {ety.wikidata && details?.[ety.wikidata]?.name ? details?.[ety.wikidata]?.name : ety.wikidata}
                </a>
            </li>)}
        </ul> : feature.properties?.text_etymology,
        names = useMemo(() => {
            const localNameKey = "name:" + i18n.language,
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                mainName = feature.properties?.[localNameKey] || feature.properties?.name || feature.properties?.["name:en"],
                nameArray: string[] = [];
            if (feature.properties?.alt_name)
                nameArray.push(...feature.properties.alt_name.split(";"));
            if (typeof mainName === "string") {
                const lowerName = mainName.toLowerCase().replaceAll('“', '"').replaceAll('”', '"'),
                    includedInAnyAltName = nameArray.some(alt_name =>
                        alt_name.toLowerCase().replaceAll('“', '"').replaceAll('”', '"').includes(lowerName)
                    );
                if (!includedInAnyAltName)
                    nameArray.push(mainName);
            }

            return nameArray.join(" / ");
        }, [feature.properties, i18n.language]);

    return <tr>
        <td>{names}</td>
        <td><FeatureButtonRow feature={feature} /></td>
        <td>{etyCellContent}</td>
    </tr>;
}
