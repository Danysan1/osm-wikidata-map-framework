import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { OwmfFeature } from "@/src/model/OwmfResponse";
import { WikidataDetailsService } from "@/src/services/WikidataDetailsService/WikidataDetailsService";
import { getLinkedEntities } from "@/src/services/etymologyUtils";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./DataTable.module.css";
import { DataTableRow } from "./DataTableRow";

interface DataTableProps {
    features: OwmfFeature[];
    setOpenFeature: (feature: OwmfFeature) => void;
}

export const DataTable: FC<DataTableProps> = ({ features, setOpenFeature }) => {
    const { t, i18n } = useTranslation(),
        uniqueFeatures = useMemo(() => Object.values(
            features.reduce<Record<string, OwmfFeature>>((acc, f) => {
                const name = (f.properties?.name ?? ""),
                    etys = (getLinkedEntities(f)?.map(e => e.wikidata)?.sort()?.join() ?? ""),
                    key = name + etys;
                if (!acc[key]) acc[key] = f;
                return acc;
            }, {})
        ), [features]),
        [etymologyDetails, setEtymologyDetails] = useState<Record<string, EtymologyDetails>>();

    useEffect(() => {
        const wikidataIdArray = Object.values(uniqueFeatures).flatMap(
            f => getLinkedEntities(f)?.filter(e => e.wikidata)?.map(e => e.wikidata!) ?? []
        ),
            uniqueWikidataIds = new Set<string>(wikidataIdArray),
            detailsService = new WikidataDetailsService(i18n.language);

        detailsService.fetchEtymologyDetails(uniqueWikidataIds).then(
            (details) => setEtymologyDetails(details)
        ).catch(
            (e) => console.error("Error fetching etymology details", e)
        );
    }, [uniqueFeatures, i18n.language]);

    return <table className={styles.data_table}>
        <thead>
            <tr>
                <th>{t("data_table.names")}</th>
                <th>{t("data_table.actions")}</th>
                <th>{t("data_table.linked_entities")}</th>
            </tr>
        </thead>
        <tbody>{uniqueFeatures.map((f, i) => (
            <DataTableRow
                key={f.id ?? i}
                feature={f}
                openFeatureDetails={() => setOpenFeature(f)}
                details={etymologyDetails}
            />
        )
        )}</tbody>
    </table>;
}
