import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { WikidataDetailsService } from "@/src/services/WikidataDetailsService/WikidataDetailsService";
import { getEtymologies } from "@/src/services/etymologyUtils";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./DataTable.module.css";
import { DataTableRow } from "./DataTableRow";

interface DataTableProps {
    features: EtymologyFeature[];
    setOpenFeature: (feature: EtymologyFeature) => void;
}

export const DataTable: FC<DataTableProps> = ({ features, setOpenFeature }) => {
    const { t, i18n } = useTranslation(),
        uniqueFeatures = useMemo(() => Object.values(
            features.reduce<Record<string, EtymologyFeature>>((acc, f) => {
                const name = (f.properties?.name ?? ""),
                    etys = (getEtymologies(f)?.map(e => e.wikidata)?.sort()?.join() ?? ""),
                    key = name + etys;
                if (!acc[key]) acc[key] = f;
                return acc;
            }, {})
        ), [features]),
        [etymologyDetails, setEtymologyDetails] = useState<Record<string, EtymologyDetails>>();

    useEffect(() => {
        const wikidataIdArray = Object.values(uniqueFeatures).flatMap(
            f => getEtymologies(f)?.filter(e => e.wikidata)?.map(e => e.wikidata!) ?? []
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
